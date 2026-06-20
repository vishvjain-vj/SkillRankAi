from dotenv import load_dotenv
load_dotenv()  # must run before any os.environ.get() calls below or in imported modules

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.memory_db import init_db
from api.auth import router as auth_router
from api.chat import router as chat_router
import os

app = FastAPI(title="SkillRank AI API", version="2.0.0")

# Allow the Vercel frontend domain + localhost for dev.
# Set ALLOWED_ORIGINS in Railway env vars to your actual Vercel URL.
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    key_status = "set" if os.environ.get("OPENROUTER_API_KEY") else "MISSING"
    print(f"✅ Database initialised | OPENROUTER_API_KEY: {key_status}")


app.include_router(auth_router)
app.include_router(chat_router)


@app.get("/")
def health():
    return {"status": "online", "version": "2.0.0"}