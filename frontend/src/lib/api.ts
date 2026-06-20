const BASE = "/api"; // proxied to backend via next.config.js rewrites

export interface LoginResponse {
  user_id: string;
  name: string;
  global_score: number;
  message: string;
}

export interface ChatResponse {
  reply: string;
  score_added: number;
  total_score: number;
  reason: string;
}

export async function login(student_id: string, name: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id, name }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}

/**
 * Streams /chat as NDJSON lines:
 *   {"type":"chunk","content":"..."}     -> repeated, in order
 *   {"type":"error","content":"..."}     -> stream aborted
 *   {"type":"done","score_added":N,"total_score":N,"reason":"..."} -> terminal, OR
 * A non-streamed JSON response (bluff phases) is also valid and is delivered
 * as a single "done" callback with reply already known.
 *
 * onChunk:  called for each text fragment as it arrives
 * onDone:   called once with final score/reason when the stream finishes
 */
export async function sendMessageStream(
  message: string,
  user_id: string,
  session_id: string,
  onChunk: (text: string) => void,
  onDone: (result: { score_added: number; total_score: number; reason: string }) => void,
  onError: (message: string) => void
): Promise<void> {
  console.log("[FE] sendMessageStream() called", { message, user_id, session_id });

  let res: Response;
  try {
    console.log("[FE] firing fetch to", `${BASE}/chat`);
    res = await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, user_id, session_id }),
    });
    console.log("[FE] fetch resolved, status =", res.status, "ok =", res.ok);
  } catch (e) {
    console.log("[FE] fetch THREW before headers arrived:", e);
    onError("⚠️ Connection error. Try again.");
    return;
  }

  if (!res.ok) {
    console.log("[FE] response not ok, status =", res.status);
    onError(`⚠️ Server error (${res.status}). Try again.`);
    return;
  }

  const contentType = res.headers.get("content-type") || "";
  console.log("[FE] content-type header =", contentType);

  // Bluff phases return plain JSON (not streamed) — handle both.
  if (contentType.includes("application/json")) {
    console.log("[FE] taking non-streamed JSON branch (bluff phase)");
    const data: ChatResponse = await res.json();
    onChunk(data.reply);
    onDone({
      score_added: data.score_added,
      total_score: data.total_score,
      reason: data.reason,
    });
    return;
  }

  if (!res.body) {
    console.log("[FE] res.body is null — browser/fetch polyfill issue");
    onError("⚠️ No response body from server.");
    return;
  }

  console.log("[FE] entering stream-reading loop");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let readCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      readCount++;
      console.log(`[FE] reader.read() #${readCount} -> done=${done}, bytes=${value?.length ?? 0}`);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // NDJSON: split on newlines, keep the last partial line in buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let event: any;
        try {
          event = JSON.parse(trimmed);
        } catch {
          console.log("[FE] skipped malformed NDJSON line:", trimmed.slice(0, 100));
          continue;
        }

        console.log("[FE] parsed event:", event.type);

        if (event.type === "chunk") {
          onChunk(event.content);
        } else if (event.type === "error") {
          onError(event.content || "⚠️ The AI is temporarily unavailable.");
        } else if (event.type === "done") {
          onDone({
            score_added: event.score_added,
            total_score: event.total_score,
            reason: event.reason,
          });
        }
      }
    }

    console.log("[FE] stream loop exited normally, total reads =", readCount);

    // Flush any trailing buffered line after the stream closes
    const trimmed = buffer.trim();
    if (trimmed) {
      try {
        const event = JSON.parse(trimmed);
        if (event.type === "done") {
          onDone({
            score_added: event.score_added,
            total_score: event.total_score,
            reason: event.reason,
          });
        }
      } catch {
        console.log("[FE] trailing buffer was not valid JSON:", trimmed.slice(0, 100));
      }
    }
  } catch (err) {
    console.log("[FE] stream-reading loop THREW:", err);
    onError("⚠️ Connection dropped mid-response.");
  }
}