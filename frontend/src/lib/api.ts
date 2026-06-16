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

export async function sendMessage(
  message: string,
  user_id: string,
  session_id: string
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user_id, session_id }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}