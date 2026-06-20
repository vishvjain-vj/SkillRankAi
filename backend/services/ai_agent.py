import os
import json
import httpx

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"

# Update these constants at the top of your script
# Use the exact slug provided by OpenRouter
CHAT_MODEL = os.environ.get("CHAT_MODEL", "liquid/lfm-2.5-1.2b-instruct:free")
SCORE_MODEL = os.environ.get("SCORE_MODEL", "liquid/lfm-2.5-1.2b-thinking:free")

# Free models available on OpenRouter (no billing needed):
# - meta-llama/llama-3.1-8b-instruct:free
# - meta-llama/llama-3.2-3b-instruct:free
# - google/gemma-2-9b-it:free
#
# Paid models (add billing to OpenRouter account):
# - anthropic/claude-haiku-4-5          (~$0.00025/1K tokens)
# - anthropic/claude-sonnet-4-5         (~$0.003/1K tokens)
# - openai/gpt-4o-mini
# - google/gemini-flash-1.5


def _call(model: str, messages: list, temperature: float = 0.7, max_tokens: int = 1000) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://skillrank.ai",
        "X-Title": "SkillRank AI",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    resp = httpx.post(OPENROUTER_BASE, json=payload, headers=headers, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _call_stream(model: str, messages: list, temperature: float = 0.7, max_tokens: int = 1000):
    """
    Streams content chunks from OpenRouter via SSE.
    Guards against:
      - keep-alive/comment lines (": OPENROUTER PROCESSING" etc.)
      - chunks with an empty `choices` list
      - chunks that aren't valid JSON
      - the literal "[DONE]" sentinel
    """
    print("[STREAM] _call_stream() entered", flush=True)

    if not OPENROUTER_API_KEY:
        print("[STREAM] ABORT: OPENROUTER_API_KEY is empty/missing", flush=True)
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://skillrank.ai",
        "X-Title": "SkillRank AI",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    print(f"[STREAM] opening httpx.stream to OpenRouter, model={model}", flush=True)

    line_count = 0
    chunk_count = 0

    with httpx.stream("POST", OPENROUTER_BASE, json=payload, headers=headers, timeout=60.0) as response:
        print(f"[STREAM] connection opened, status={response.status_code}", flush=True)
        response.raise_for_status()

        for raw_line in response.iter_lines():
            line_count += 1
            if line_count <= 3:
                # Print only the first few raw lines to avoid log spam
                print(f"[STREAM] raw_line #{line_count}: {raw_line!r}", flush=True)

            if not raw_line:
                continue

            line = raw_line.strip()

            if not line.startswith("data:"):
                continue

            content = line[len("data:"):].strip()

            if content == "[DONE]":
                print(f"[STREAM] saw [DONE] after {line_count} lines, {chunk_count} chunks yielded", flush=True)
                break
            if not content:
                continue

            try:
                data = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"[STREAM] JSON decode failed on line #{line_count}: {e}", flush=True)
                continue

            choices = data.get("choices")
            if not choices:
                if line_count <= 5:
                    print(f"[STREAM] empty choices on line #{line_count}, raw data={data}", flush=True)
                continue

            delta = choices[0].get("delta", {}) or {}
            piece = delta.get("content")
            if piece:
                chunk_count += 1
                if chunk_count == 1:
                    print(f"[STREAM] first content chunk yielded: {piece!r}", flush=True)
                yield piece

        print(f"[STREAM] loop ended naturally — total lines={line_count}, chunks={chunk_count}", flush=True)


def generate_reply(messages: list) -> str:
    print(f"STEP 1 → Calling {CHAT_MODEL} via OpenRouter")
    system = {"role": "system", "content": "You are a helpful, intelligent, and concise tutor."}
    result = _call(CHAT_MODEL, [system, *messages])
    print("STEP 1 DONE → Reply generated")
    return result


def evaluate_curiosity(user_prompt: str) -> tuple[int, str]:
    print(f"STEP 2 → Scoring curiosity via {SCORE_MODEL}")
    system_prompt = """You are an expert behavioral analyst and educator.
Evaluate the user's "Curiosity Depth" from 1 to 10:

1-3 (Surface): Basic facts, simple trivia, or asking AI to write/generate code.
4-7 (Exploring): Broad explanations, summaries, or general tutorials.
8-10 (Deep): Highly specific questions exploring how or why complex concepts interact.

Output ONLY valid JSON, no markdown, no extra text.
Format: {"score": <integer>, "reasoning": "<one short sentence>"}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    try:
        raw = _call(SCORE_MODEL, messages, temperature=0.1, max_tokens=100)
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        score = max(1, min(10, int(data.get("score", 1))))
        reason = data.get("reasoning", "No reason provided")
        print(f"STEP 2 DONE → Score: {score} | {reason}")
        return score, reason
    except Exception as e:
        print(f"SCORING ERROR: {e}")
        return 1, "Failed to parse score"


def generate_bluff_question() -> tuple[str, str]:
    """Ask the LLM to generate a fresh reading comprehension trap every time."""
    print("BLUFF → Generating dynamic comprehension check")
    system_prompt = """Generate a short reading comprehension trap for a student.
Output ONLY valid JSON:
{
  "passage": "<2-3 sentence science/tech passage>",
  "question": "<single specific question about the passage>",
  "answer_keyword": "<one lowercase word that must appear in a correct answer>"
}"""
    messages = [{"role": "user", "content": "Generate a new trap now."}]
    try:
        raw = _call(SCORE_MODEL, [{"role": "system", "content": system_prompt}, *messages],
                    temperature=0.9, max_tokens=300)
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        passage = data["passage"]
        question = data["question"]
        keyword = data["answer_keyword"].lower().strip()
        return f"{passage}\n\n**{question}** *(Reply with the single key word.)*", keyword
    except Exception as e:
        print(f"BLUFF GENERATION ERROR: {e}")
        # Fallback static trap
        return (
            "The mitochondria generates ATP through cellular respiration and has its own DNA.\n\n"
            "**What organelle produces the cell's energy?** *(Reply with the single key word.)*",
            "mitochondria",
        )