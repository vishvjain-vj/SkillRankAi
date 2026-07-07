# SkillRank AI

> **Curiosity is your currency.**

An agentic AI tutor that tracks how hard you think. Ask shallow questions, earn low XP. Go deep — get rewarded. Every interaction is scored, ranked, and remembered.

🔗 **Live:** [skillrankai.vercel.app](https://skillrankai.vercel.app)

---

## What It Does

SkillRank AI is not a regular chatbot. It runs a multi-agent workflow behind every message:

- **Tracking Agent** — monitors your interaction velocity and engagement depth
- **Bluff Protocol Agent** — deploys timed comprehension checks to catch surface-level responses
- **XP Agent** — scores each response and awards dynamic Experience Points based on quality

The more you think, the more you earn. The more you earn, the higher your rank.

---

## Features

-  **AI Tutor with XP Scoring** — responses are evaluated in real time; score updates after every message
-  **Streaming Responses** — token-by-token output via FastAPI streaming endpoint
-  **Rank Ladder** — progress from Novice → Thinker → Scholar → Legend Chase through accumulated XP
-  **Badges** — unlock achievements (First Step, On Fire, Scholar, Legend Chase) based on session stats
-  **Dual Auth** — Google OAuth and email/password credentials via NextAuth.js
-  **Live Sidebar** — real-time score ring, session message count, last XP earned, rank progress
-  **Model Flexibility** — powered by Liquid LFM 3.1 (free tier) via OpenRouter by default; users can switch models

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Auth | NextAuth.js — Google OAuth + Credentials |
| Backend | FastAPI (Python) |
| AI | OpenRouter API (Liquid LFM 3.1 Instruct / Thinking 2.5) |
| Hosting | Vercel (frontend) + Render (backend) |
| Database | SQLite (production) |

---

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.10+
- An [OpenRouter](https://openrouter.ai) API key
- A Google OAuth client (for Google sign-in)

### 1. Clone the repo

```bash
git clone https://github.com/vishvjain-vj/SkillRankAi
cd SkillRankAi
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
OPENROUTER_API_KEY=your_openrouter_key
```

Start the backend:
```bash
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BACKEND_URL=http://127.0.0.1:8000
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

Start the frontend:
```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Project Structure

```
SkillRankAi/
├── backend/
│   ├── api/              # Route handlers
│   ├── database/         # DB models and connection
│   ├── services/         # Agent logic, XP scoring
│   ├── main.py           # FastAPI entry point
│   └── requirements.txt
└── frontend/
    ├── src/
    │   └── app/
    │       ├── api/auth/ # NextAuth route handler
    │       ├── page.tsx  # Main app (intro + login + chat)
    │       └── ...
    ├── public/
    │   └── logo.png
    └── package.json
```

---

## Environment Variables

### Frontend (Vercel)

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Your production URL e.g. `https://skillrankai.vercel.app` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `BACKEND_URL` | Your deployed FastAPI URL |

### Backend (Render)

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | From openrouter.ai |

---

## How XP Works

Each AI response is evaluated by the XP Agent across multiple dimensions:

- **Depth** — did you ask a follow-up or go surface-level?
- **Specificity** — vague questions score lower
- **Engagement** — the Bluff Protocol catches copy-paste and one-word replies
- **Consistency** — sustained sessions score higher than one-off questions

XP can be negative if the agent detects low-effort inputs.

---

## Rank Ladder

| Rank | XP Required |
|---|---|
| Novice | 0 |
| Thinker | 100 |
| Scholar | 350 |
| Legend Chase | 800 |

---

## Deployment

Frontend is auto-deployed to Vercel on every push to `main`.
Backend is deployed on Render — free tier spins down after inactivity (use [UptimeRobot](https://uptimerobot.com) to keep it warm).

---

## License

MIT
