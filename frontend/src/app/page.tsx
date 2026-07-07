"use client";
import Image from "next/image";
import {UserMenu} from "@/components/UserMenu";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { login, sendMessageStream } from "@/lib/api";
import { getRank, rankProgress, RANKS } from "@/lib/ranks";
import { useSession, signIn, signOut } from "next-auth/react";

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
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginErr] = useState("");
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [lastXP, setLastXP]       = useState(0);
  const [interactions, setInteractions] = useState(0);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introVisible, setIntroVisible] = useState(false);
  const [introExit, setIntroExit] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIntroVisible(true), 80);
    setTimeout(() => triggerExit(), 2800);
  }, []);

  function triggerExit() {
    setIntroExit(true);
    setTimeout(() => {
      setShowIntro(false);
      setTimeout(() => setLoginVisible(true), 50);
    }, 500);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    async function syncWithBackend() {
      if (status === "authenticated" && session?.user?.email) {
        try {
          const userEmail = session.user.email;
          const userName = session.user.name || "Student";
          const data = await login(userEmail, userName);
          setUser({ 
            user_id: data.user_id, 
            name: data.name, 
            global_score: data.global_score 
          });
        } catch (error) {
          console.error("Failed to sync with backend:", error);
          setLoginErr("Connected to Google, but backend server is offline.");
        }
      } else if (status === "unauthenticated") {
        setUser(null);
      }
    }
    syncWithBackend();
  }, [status, session]);

  async function handleSend() {
    if (!input.trim() || loading || !user) return;
    const text = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setLoading(true);

    const assistantIndex = messages.length + 1;

    function updateAssistant(updater: (msg: Message) => Message) {
      setMessages(m => {
        const next = [...m];
        if (next[assistantIndex]) {
          next[assistantIndex] = updater(next[assistantIndex]);
        }
        return next;
      });
    }

    try {
      await sendMessageStream(
        text,
        user.user_id,
        `session_${user.user_id}`,
        (piece) => {
          updateAssistant(msg => ({ ...msg, content: msg.content + piece }));
        },
        (result) => {
          updateAssistant(msg => ({ ...msg, xp: result.score_added }));
          setUser(u => (u ? { ...u, global_score: result.total_score } : u));
          setLastXP(result.score_added);
          setInteractions(n => n + 1);
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        },
        (errMsg) => {
          updateAssistant(msg => ({ ...msg, content: msg.content || errMsg }));
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      );
    } catch {
      updateAssistant(msg => ({ ...msg, content: "⚠️ Connection error. Try again." }));
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── NOT LOGGED IN ─────────────────────────────────────────────────────────
  if (!user) {

    // NextAuth loading
    if (status === "loading") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
          <div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    // Intro animation screen
    if (showIntro) {
      return (
        <div
          className={`min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500 ${
            introExit ? "scale-105 opacity-0" : ""
          }`}
          onClick={triggerExit}
        >
          <div
            className={`relative w-[110px] h-[110px] rounded-full bg-black border border-white/5 overflow-hidden transition-all duration-700 ${
              introVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
          >
            <Image src="/logo.png" alt="SkillRank AI" fill sizes="110px" className="object-contain scale-150" />
          </div>

          <h1
            className={`font-sans text-5xl font-black tracking-widest bg-gradient-to-r from-teal-200 via-teal-400 to-cyan-400 bg-clip-text text-transparent transition-all duration-[600ms] ${
              introVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "0.5s" }}
          >
            SKILLRANK AI
          </h1>

          <p
            className={`font-sans text-xs tracking-widest text-white/35 uppercase transition-all duration-[600ms] ${
              introVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "0.9s" }}
          >
            Curiosity is your currency.
          </p>

          <p
            className={`font-sans text-[10px] tracking-widest text-white/20 uppercase absolute bottom-8 transition-all duration-500 ${
              introVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "1.4s" }}
          >
            TAP TO CONTINUE →
          </p>
        </div>
      );
    }

    // Login screen
    return (
      <div className={`min-h-screen relative flex items-center justify-center p-4 transition-all duration-500 ${
        loginVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}>

        {/* Header */}
        <div className="absolute top-[5%] left-0 right-0 mx-auto w-full max-w-xl text-center px-4">
          <div className="relative w-[150px] h-[150px] mx-auto mb-6 flex justify-center bg-black rounded-full overflow-hidden border border-white/5">
            <Image
              src="/logo.png"
              alt="Platform Logo"
              fill
              sizes="200px"
              priority
              className="object-contain scale-150 animate-teal drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]"
            />
          </div>
          <h1 className="font-sans text-7xl md:text-6xl font-black tracking-widest whitespace-nowrap bg-gradient-to-r from-teal-200 via-teal-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg w-full text-center">
            SKILLRANK AI
          </h1>
          <p className="font-sans text-[20px] text-white/40 tracking-widest mt-3 uppercase bg-gradient-to-r from-teal-200 via-teal-400 to-cyan-400 bg-clip-text drop-shadow-lg w-full text-center">
            Curiosity is your currency.
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-md z-20 mt-[220px]">

          <div className="flex bg-[#161b22] rounded-xl p-1 mb-6 border border-white/10">
            <button
              onClick={() => setIsLoginView(true)}
              className={`flex-1 py-2 text-sm font-sans font-bold tracking-widest rounded-lg transition-all ${isLoginView ? 'bg-teal-500/20 text-teal-400' : 'text-white/40 hover:text-white/80'}`}
            >
              LOG IN
            </button>
            <button
              onClick={() => setIsLoginView(false)}
              className={`flex-1 py-2 text-sm font-sans font-bold tracking-widest rounded-lg transition-all ${!isLoginView ? 'bg-teal-500/20 text-teal-400' : 'text-white/40 hover:text-white/80'}`}
            >
              SIGN UP
            </button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginErr("");
              const result = await signIn("credentials", {
                email,
                password,
                isLogin: String(isLoginView),
                redirect: false,
              });
              if (result?.error) {
                setLoginErr(isLoginView ? "Invalid email or password." : "Could not create that account.");
              }
            }}
            className="space-y-4"
          >
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#161b22] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 font-sans text-lg focus:outline-none focus:border-teal-400/50 transition-all duration-300"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#161b22] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 font-sans text-lg focus:outline-none focus:border-teal-400/50 transition-all duration-300"
            />
            <button
              type="submit"
              className="w-full bg-teal-500/80 text-white font-sans text-[18px] font-bold tracking-widest py-4 rounded-xl border border-teal-400/50 hover:bg-teal-500 transition-all duration-300"
            >
              {isLoginView ? "ACCESS TERMINAL" : "INITIALIZE ACCOUNT"}
            </button>
          </form>

          {loginError && (
            <p className="mt-4 text-center font-sans text-xs tracking-widest text-red-400">
              {loginError}
            </p>
          )}

          <div className="flex items-center my-6 gap-4">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="font-sans text-xs text-white/30 tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button
            onClick={() => {
              setLoginErr("");
              signIn("google", { callbackUrl: "/" }, { prompt: "select_account" });
            }}
            type="button"
            className="w-full bg-white text-black font-sans text-[16px] font-bold tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all duration-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            CONTINUE WITH GOOGLE
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN APP (logged in) ──────────────────────────────────────────────────
  const score    = user.global_score;
  const rank     = getRank(score);
  const progress = rankProgress(score);

  return (
    <div className="h-screen flex overflow-hidden bg-[#0d1117]">

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          bg-[#0d1117] border-r border-white/[0.06] flex flex-col
          transition-all duration-300 overflow-hidden flex-shrink-0
          ${sidebarOpen ? "w-68" : "w-0"}
        `}
      >
        <div className="w-64 h-full flex flex-col p-4 gap-5 overflow-y-auto">
          <header className="flex items-center justify-end px-2 py-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white/40 hover:text-white/80 transition-colors text-sm"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </header>

          {/* Score ring */}
          <div className="flex flex-col items-center gap-2 p-4 bg-[#161b22] border border-white/[0.06] rounded-2xl">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"/>
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="9"
                  strokeDasharray={`${(2 * Math.PI * 48 * (progress.progressPercentage || 0)) / 100} ${2 * Math.PI * 48}`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6"/>
                    <stop offset="100%" stopColor="#5eead4"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-orbitron text-2xl font-black text-teal-300">{score}</span>
              </div>
            </div>
            <span className="font-sans text-[11px] font-semi tracking-widest text-white/30 uppercase">Curiosity XP</span>
            <span className="font-orbitron text-sm font-bold tracking-wider" style={{ color: rank.color }}>
              {rank.name}
            </span>
            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-teal-300 rounded-full transition-all duration-500"
                   style={{ width: `${progress.progressPercentage}%` }}/>
            </div>
            <span className="font-sans text-[9px] text-white/20">{progress.progressPercentage.toFixed(0)}% to next rank</span>
          </div>

          {/* Session stats */}
          <div>
            <p className="font-sans text-[11px] tracking-widest text-teal-300/70 mb-2">▸ SESSION</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#161b22] border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="font-orbitron text-lg text-teal-300">{interactions}</div>
                <div className="font-sans text-[9px] text-white/30 uppercase mt-1">Messages</div>
              </div>
              <div className="bg-[#161b22] border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="font-orbitron text-lg" style={{ color: lastXP >= 0 ? "#5eead4" : "#f87171" }}>
                  {lastXP >= 0 ? "+" : ""}{lastXP}
                </div>
                <div className="font-sans text-[9px] text-white/30 uppercase mt-1">Last XP</div>
              </div>
            </div>
          </div>

          {/* Rank ladder */}
          <div>
            <p className="font-sans text-[11px] tracking-widest text-teal-300/70 mb-2">▸ RANK LADDER</p>
            <div className="space-y-1">
              {RANKS.map(r => {
                const isActive = rank.name === r.name;
                const isDone   = score >= r.threshold && !isActive;
                return (
                  <div key={r.name}
                       className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] font-sans
                         ${isActive ? "bg-teal-400/[0.08] border border-teal-400/20" : ""}
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
            <p className="font-sans text-[11px] tracking-widest text-teal-300/70 mb-2">▸ BADGES</p>
            <div className="flex flex-wrap gap-1">
              {[
                ["⚡", "FIRST STEP",   interactions >= 1],
                ["🧠", "THINKER",      score >= 100],
                ["🔥", "ON FIRE",      interactions >= 5],
                ["💎", "SCHOLAR",      score >= 350],
                ["👑", "LEGEND CHASE", score >= 800],
              ].map(([icon, label, earned]) => (
                <span key={label as string}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-sans border
                        ${earned
                          ? "bg-teal-400/[0.08] border-teal-400/25 text-teal-300"
                          : "bg-white/[0.02] border-white/[0.06] text-white/20"}`}>
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={() => { setMessages([]); setLastXP(0); setInteractions(0); }}
              className="w-full py-2 font-sans text-[10px] tracking-widest text-white/30 border border-white/[0.06] rounded-lg hover:border-red-400/30 hover:text-red-400 transition-all"
            >
              ↺ RESET SESSION
            </button>
            <p className="text-center font-sans text-[8px] text-white/15 mt-3 tracking-widest">
              SKILLRANK AI · v2.0
            </p>
          </div>
        </div>
      </aside>

      {/* ── CHAT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white/50 hover:text-white/90 transition-colors text-xl leading-none"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b22] border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-teal-300 animate-blink"/>
              <span className="font-sans text-[15px] font-bold tracking-widest text-white/80">LIVE</span>
            </div>
          </div>

          <span className="font-sans text-[15px] text-white/80 tracking-widest hidden md:block">
            DEEPER QUESTIONS = MORE XP ⚡
          </span>

          <UserMenu
            userName={user.name}
            onLogout={() => {
              setUser(null);
              signOut({ callbackUrl: "/" });
            }}
          />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20">
              <div className="relative w-[140px] h-[140px] mx-auto mb-6 flex justify-center bg-black rounded-full overflow-hidden border border-white/5">
                <Image
                  src="/logo.png"
                  alt="Platform Logo"
                  fill
                  sizes="200px"
                  priority
                  className="object-contain scale-150 animate-teal drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                />
              </div>
              <h2 className="font-sans text-7xl font-black tracking-widest bg-gradient-to-r from-teal-200 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                SKILLRANK AI
              </h2>
              <p className="font-sans text-[20px] text-white/50 max-w-sm">
                Your curiosity is being tracked.<br/>
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-5 py-4 text-lg leading-relaxed shadow-sm
                ${msg.role === "user"
                  ? "bg-[#1e293b] text-white/90 rounded-br-md"
                  : "bg-[#161b22] border border-white/[0.06] text-white/80 rounded-bl-md"}`}>
                <div className="prose-chat">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === "assistant" && msg.xp !== undefined && msg.xp !== 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-2">
                    <span className="font-sans text-[13px]"
                          style={{ color: msg.xp > 0 ? "#5eead4" : "#f87171" }}>
                      ⚡ {msg.xp > 0 ? "+" : ""}{msg.xp} XP
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-teal-300/60 rounded-full animate-bounce"
                         style={{ animationDelay: `${i * 0.15}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-6 border-t border-white/[0.06] bg-gradient-to-t from-[#0d1117] via-[#0d1117]/80 to-transparent">
          <div className="flex gap-3 items-end max-w-5xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask something curious…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-[#161b22] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/40
                         font-sans text-lg resize-none focus:outline-none focus:border-teal-400/50 focus:bg-[#1c2230]
                         transition-all duration-300 disabled:opacity-50"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 bg-teal-400/10 border border-teal-400/30 text-teal-300 rounded-2xl px-5 py-6
                        font-sans text-sm font-bold tracking-widest
                        hover:bg-teal-400/20 hover:border-teal-400/50
                        transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </div>
          <p className="font-sans text-[15px] text-white/15 text-center mt-3 tracking-widest">
            · SKILLRANK AI ·
          </p>
        </div>
      </div>
    </div>
  );
}