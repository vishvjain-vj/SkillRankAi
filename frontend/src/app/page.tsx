
"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { login, sendMessage } from "@/lib/api";
import { getRank, rankProgress, RANKS } from "@/lib/ranks";

interface Message {
  role: "user" | "assistant";
  content: string;
  xp?: number;
}

interface User {
  user_id: string;
  name: string;
  global_score: number;
}

export default function Home() {
  const [user, setUser]           = useState<User | null>(null);
  const [loginError, setLoginErr] = useState("");
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [lastXP, setLastXP]       = useState(0);
  const [interactions, setInteractions] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Login ─────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id   = (fd.get("student_id") as string).trim();
    const name = (fd.get("name") as string).trim();
    if (!id || !name) return;
    try {
      const data = await login(id, name);
      setUser({ user_id: data.user_id, name: data.name, global_score: data.global_score });
    } catch {
      setLoginErr("Could not reach the server. Is the backend running?");
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || loading || !user) return;
    const text = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const data = await sendMessage(text, user.user_id, `session_${user.user_id}`);
      setMessages(m => [...m, { role: "assistant", content: data.reply, xp: data.score_added }]);
      setUser(u => u ? { ...u, global_score: data.total_score } : u);
      setLastXP(data.score_added);
      setInteractions(n => n + 1);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "⚠️ Connection error. Try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-orange-500 text-3xl mb-4 animate-pulse_gold">
              🏆
            </div>
            <h1 className="font-orbitron text-4xl font-black tracking-widest bg-gradient-to-r from-gold via-mint to-purple bg-clip-text text-transparent">
              SKILLRANK AI
            </h1>
            <p className="font-mono text-xs text-white/30 tracking-widest mt-1">
              CURIOSITY IS YOUR CURRENCY
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              name="student_id"
              placeholder="Student ID"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-mint/50 font-body text-lg"
            />
            <input
              name="name"
              placeholder="First name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-mint/50 font-body text-lg"
            />
            {loginError && (
              <p className="text-red-400 font-mono text-xs">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono text-sm tracking-widest py-3 rounded-xl hover:bg-slate-800 transition-all"            >
              ACCESS TERMINAL
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  const score    = user.global_score;
  const rank     = getRank(score);
  const progress = rankProgress(score);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          bg-black/40 border-r border-white/5 flex flex-col p-4 gap-4 overflow-y-auto
          transition-all duration-300
          ${sidebarOpen ? "w-64" : "w-0 p-0"}
        `}
      > 
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/70 hover:text-white"
          >
            ☰
          </button>
        </header>

        {/* Score ring (CSS-based) */}
        <div className="flex flex-col items-center gap-2 p-4 bg-white/2 border border-white/5 rounded-2xl">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9"/>
              <circle
                cx="60" cy="60" r="48" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="9"
                strokeDasharray={`${(2 * Math.PI * 48 * progress) / 100} ${2 * Math.PI * 48}`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ffb4"/>
                  <stop offset="100%" stopColor="#ffd700"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-orbitron text-2xl font-black text-gold">{score}</span>
            </div>
          </div>
          <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">Curiosity XP</span>
          <span className="font-orbitron text-sm font-bold tracking-wider" style={{ color: rank.color }}>
            {rank.name}
          </span>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-mint to-gold rounded-full transition-all duration-500"
                 style={{ width: `${progress}%` }}/>
          </div>
          <span className="font-mono text-[9px] text-white/20">{progress}% to next rank</span>
        </div>

        {/* Session stats */}
        <div>
          <p className="font-mono text-[9px] tracking-widest text-gold mb-2">▸ SESSION</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
              <div className="font-orbitron text-lg text-mint">{interactions}</div>
              <div className="font-mono text-[8px] text-white/30 uppercase mt-1">Messages</div>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
              <div className="font-orbitron text-lg" style={{ color: lastXP >= 0 ? "#00ffb4" : "#ef4444" }}>
                {lastXP >= 0 ? "+" : ""}{lastXP}
              </div>
              <div className="font-mono text-[8px] text-white/30 uppercase mt-1">Last XP</div>
            </div>
          </div>
        </div>

        {/* Rank ladder */}
        <div>
          <p className="font-mono text-[9px] tracking-widest text-gold mb-2">▸ RANK LADDER</p>
          <div className="space-y-1">
            {RANKS.map(r => {
              const isActive = rank.name === r.name;
              const isDone   = score >= r.threshold && !isActive;
              return (
                <div key={r.name}
                     className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] font-mono
                       ${isActive ? "bg-gold/5 border border-gold/20" : ""}
                       ${isDone   ? "opacity-50" : ""}
                       ${!isActive && !isDone ? "opacity-20" : ""}`}>
                  <span>{isActive ? "▶" : isDone ? "✓" : "🔒"}</span>
                  <span className="font-bold tracking-widest" style={{ color: r.color }}>{r.name}</span>
                  <span className="ml-auto text-white/30">{r.threshold}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div>
          <p className="font-mono text-[9px] tracking-widest text-gold mb-2">▸ BADGES</p>
          <div className="flex flex-wrap gap-1">
            {[
              ["⚡", "FIRST STEP",   interactions >= 1],
              ["🧠", "THINKER",      score >= 100],
              ["🔥", "ON FIRE",      interactions >= 5],
              ["💎", "SCHOLAR",      score >= 350],
              ["👑", "LEGEND CHASE", score >= 800],
            ].map(([icon, label, earned]) => (
              <span key={label as string}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono border
                      ${earned
                        ? "bg-gold/5 border-gold/25 text-gold"
                        : "bg-white/1 border-white/5 text-white/20"}`}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => { setMessages([]); setLastXP(0); setInteractions(0); }}
            className="w-full py-2 font-mono text-[10px] tracking-widest text-white/30 border border-white/5 rounded-lg hover:border-red-500/30 hover:text-red-400 transition-all"
          >
            ↺ RESET SESSION
          </button>
          <p className="text-center font-mono text-[8px] text-white/10 mt-3 tracking-widest">
            SKILLRANK AI · v2.0
          </p>
        </div>
      </aside>

      {/* ── CHAT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mint animate-blink"/>
            <span className="font-orbitron text-xs font-bold tracking-widest text-mint">TUTOR SESSION</span>
          </div>
          <span className="font-mono text-[12px] text-mint tracking-widest">
            DEEPER QUESTIONS = MORE XP ⚡
          </span>
          <span className="font-mono text-[15px] text-mint">{user.name}</span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-orange-500 text-3xl animate-pulse_gold">
                🏆
              </div>
              <h2 className="font-orbitron text-4xl font-black tracking-widest bg-gradient-to-r from-gold via-mint to-purple bg-clip-text text-transparent">
                SKILLRANK AI
              </h2>
              <p className="font-mono text-sm text-white/30 max-w-sm">
                Ask anything. Deeper questions earn more XP. Surface-level questions earn less.<br/>
                <span className="text-mint">Your curiosity is being tracked.</span>
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm
                ${msg.role === "user"
                  ? "bg-mint/10 border border-mint/20 text-white"
                  : "bg-white/2 border border-white/6 text-white/90"}`}>
                <div className="prose-chat">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === "assistant" && msg.xp !== undefined && msg.xp !== 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                    <span className="font-mono text-[10px]"
                          style={{ color: msg.xp > 0 ? "#00ffb4" : "#ef4444" }}>
                      ⚡ {msg.xp > 0 ? "+" : ""}{msg.xp} XP
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/2 border border-white/6 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-mint/50 rounded-full animate-bounce"
                         style={{ animationDelay: `${i * 0.15}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t border-white/5">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask something curious…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-[#060912] border border-mint/20 rounded-xl px-4 py-3 text-white placeholder-white/20
                         font-body text-base resize-none focus:outline-none focus:border-mint/50 transition-colors
                         disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 bg-mint/10 border border-mint/30 text-mint rounded-xl px-5 py-3
                         font-mono text-sm tracking-widest hover:bg-mint/20 transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </div>
          <p className="font-mono text-[9px] text-white/15 text-center mt-2 tracking-widest">
            SHIFT+ENTER FOR NEW LINE · ENTER TO SEND
          </p>
        </div>
      </div>
    </div>
  );
}