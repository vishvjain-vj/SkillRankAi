import time
import json
import sqlite3
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from database.memory_db import (
    get_user, create_user,
    get_session, create_session, update_session,
    get_history, append_message,
    update_global_score, get_global_score,
)
from services.ai_agent import (
    CHAT_MODEL,
    _call_stream,
    evaluate_curiosity,
    generate_bluff_question,
)

router = APIRouter()

WORDS_PER_SEC = 4.0
SPEED_THRESHOLD = 0.30


class ChatRequest(BaseModel):
    message: str
    user_id: str = "guest"
    session_id: str = "guest_session"


@router.post("/chat")
def chat(req: ChatRequest):
    print(f"\n--- CHAT: user={req.user_id} session={req.session_id} ---", flush=True)
    print(f"[ROUTE] payload received: message={req.message[:50]!r}", flush=True)

    if not get_user(req.user_id):
        create_user(req.user_id, "Guest")
    if not get_session(req.session_id):
        create_session(req.session_id, req.user_id)

    session = get_session(req.session_id)
    current_time = time.time()
    user_msg_lower = req.message.lower()

    # ── BLUFF PHASE 2: evaluate the student's answer (non-streamed) ───────────
    if session["in_bluff_trap"]:
        time_taken = current_time - session["last_reply_time"]
        conn_kw = _get_bluff_keyword(req.session_id)
        answered_correctly = conn_kw and conn_kw.lower() in user_msg_lower

        update_session(req.session_id,
                       in_bluff_trap=0,
                       bluff_keyword="",
                       last_reply_time=current_time)

        if answered_correctly and time_taken <= 12:
            reply = f"✅ **Trap defeated!** You answered in {int(time_taken)}s with the right word. +50 XP — you actually read it."
            delta = 50
        else:
            reason = "wrong answer" if not answered_correctly else f"took {int(time_taken)}s (limit: 12s)"
            reply = f"❌ **Trap failed** ({reason}). Reading comprehension matters more than speed. −20 XP."
            delta = -20

        update_global_score(req.user_id, delta)
        update_session(req.session_id, session_score=session["session_score"] + delta)

        return {
            "reply": reply,
            "score_added": delta,
            "total_score": get_global_score(req.user_id),
            "reason": "bluff_resolved",
            "streamed": False,
        }

    # ── BLUFF PHASE 1: spring the trap (non-streamed) ──────────────────────────
    last_wc = session["last_word_count"]
    last_t  = session["last_reply_time"]
    elapsed = current_time - last_t if last_t else 999

    expected_read_time = last_wc / WORDS_PER_SEC if last_wc else 0
    is_speeding = last_wc > 50 and elapsed < expected_read_time * SPEED_THRESHOLD
    is_cocky    = any(p in user_msg_lower for p in ["read fast", "fast reader", "i skimmed"])

    if is_speeding or is_cocky:
        passage, keyword = generate_bluff_question()
        bluff_text = (
            "🤖 **Speed reader detected — comprehension check initiated.**\n\n"
            f"{passage}\n\n"
            "_You have 12 seconds. Reply immediately with the single key word._"
        )
        update_session(req.session_id,
                       in_bluff_trap=1,
                       last_reply_time=current_time)
        _store_bluff_keyword(req.session_id, keyword)

        return {
            "reply": bluff_text,
            "score_added": 0,
            "total_score": get_global_score(req.user_id),
            "reason": "bluff_initiated",
            "streamed": False,
        }

    # ── Normal flow: STREAMED response ─────────────────────────────────────────
    print("[ROUTE] entering normal (streamed) flow", flush=True)
    history = get_history(req.session_id)
    history.append({"role": "user", "content": req.message})
    print(f"[ROUTE] history length={len(history)}", flush=True)

    def event_generator():
        print("[GEN] event_generator() started executing", flush=True)
        full_reply = ""
        try:
            chunk_i = 0
            for chunk in _call_stream(CHAT_MODEL, history):
                chunk_i += 1
                if chunk_i == 1:
                    print(f"[GEN] received first chunk from _call_stream: {chunk!r}", flush=True)
                full_reply += chunk
                # NDJSON-style framing so the frontend can split events safely
                yield json.dumps({"type": "chunk", "content": chunk}) + "\n"
            print(f"[GEN] _call_stream loop finished, total chunks={chunk_i}", flush=True)
        except Exception as e:
            print(f"[GEN] STREAM ERROR: {type(e).__name__}: {e}", flush=True)
            yield json.dumps({
                "type": "error",
                "content": "The AI is temporarily unavailable. Please try again.",
            }) + "\n"
            return

        print(f"[GEN] full_reply length={len(full_reply)}, proceeding to scoring", flush=True)

        # Stream finished cleanly — now do scoring + persistence
        try:
            score_added, reason = evaluate_curiosity(req.message)
        except Exception as e:
            print(f"[GEN] SCORE ERROR (post-stream): {e}", flush=True)
            score_added, reason = 0, "scoring_failed"

        append_message(req.session_id, "user", req.message)
        append_message(req.session_id, "assistant", full_reply)

        word_count = len(full_reply.split())
        update_session(req.session_id,
                       session_score=session["session_score"] + score_added,
                       last_reply_time=time.time(),
                       last_word_count=word_count)
        update_global_score(req.user_id, score_added)

        print("[GEN] yielding final 'done' event", flush=True)
        yield json.dumps({
            "type": "done",
            "score_added": score_added,
            "total_score": get_global_score(req.user_id),
            "reason": reason,
        }) + "\n"
        print("[GEN] event_generator() fully complete", flush=True)

    print("[ROUTE] returning StreamingResponse object", flush=True)
    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


# ── Bluff keyword helpers ─────────────────────────────────────────────────────

def _get_bluff_keyword(session_id: str) -> str:
    db_path = os.environ.get("DB_PATH", "skillrank.db")
    try:
        conn = sqlite3.connect(db_path)
        row = conn.execute(
            "SELECT bluff_keyword FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        conn.close()
        return row[0] if row and row[0] else ""
    except Exception:
        return ""


def _store_bluff_keyword(session_id: str, keyword: str):
    db_path = os.environ.get("DB_PATH", "skillrank.db")
    try:
        conn = sqlite3.connect(db_path)
        try:
            conn.execute("ALTER TABLE sessions ADD COLUMN bluff_keyword TEXT DEFAULT ''")
            conn.commit()
        except Exception:
            pass
        conn.execute(
            "UPDATE sessions SET bluff_keyword = ? WHERE session_id = ?",
            (keyword, session_id),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"KEYWORD STORE ERROR: {e}")