import sqlite3
import os
import time

DB_PATH = os.environ.get("DB_PATH", "skillrank.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            user_id     TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            global_score INTEGER NOT NULL DEFAULT 0,
            created_at  REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            session_id      TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL,
            session_score   INTEGER NOT NULL DEFAULT 0,
            last_reply_time REAL NOT NULL DEFAULT 0,
            last_word_count INTEGER NOT NULL DEFAULT 0,
            in_bluff_trap   INTEGER NOT NULL DEFAULT 0,
            created_at      REAL NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            role        TEXT NOT NULL,
            content     TEXT NOT NULL,
            created_at  REAL NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        );
    """)
    conn.commit()
    conn.close()


# ── User helpers ──────────────────────────────────────────────────────────────

def get_user(user_id: str):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(user_id: str, name: str):
    conn = get_conn()
    conn.execute(
        "INSERT INTO users (user_id, name, global_score, created_at) VALUES (?, ?, 0, ?)",
        (user_id, name, time.time()),
    )
    conn.commit()
    conn.close()


def update_global_score(user_id: str, delta: int):
    conn = get_conn()
    conn.execute(
        "UPDATE users SET global_score = global_score + ? WHERE user_id = ?",
        (delta, user_id),
    )
    conn.commit()
    conn.close()


def get_global_score(user_id: str) -> int:
    conn = get_conn()
    row = conn.execute("SELECT global_score FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return row["global_score"] if row else 0


# ── Session helpers ───────────────────────────────────────────────────────────

def get_session(session_id: str):
    conn = get_conn()
    row = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_session(session_id: str, user_id: str):
    conn = get_conn()
    conn.execute(
        """INSERT INTO sessions
           (session_id, user_id, session_score, last_reply_time, last_word_count, in_bluff_trap, created_at)
           VALUES (?, ?, 0, 0, 0, 0, ?)""",
        (session_id, user_id, time.time()),
    )
    conn.commit()
    conn.close()


def update_session(session_id: str, **kwargs):
    if not kwargs:
        return
    fields = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [session_id]
    conn = get_conn()
    conn.execute(f"UPDATE sessions SET {fields} WHERE session_id = ?", values)
    conn.commit()
    conn.close()


# ── Message helpers ───────────────────────────────────────────────────────────
# We cap history at MAX_HISTORY pairs to avoid blowing the context window.

MAX_HISTORY = 20


def append_message(session_id: str, role: str, content: str):
    conn = get_conn()
    conn.execute(
        "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        (session_id, role, content, time.time()),
    )
    conn.commit()
    conn.close()


def get_history(session_id: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        """SELECT role, content FROM messages
           WHERE session_id = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (session_id, MAX_HISTORY * 2),
    ).fetchall()
    conn.close()
    # Return in chronological order
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]