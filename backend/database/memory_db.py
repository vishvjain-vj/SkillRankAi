import os
import time
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Float, Text, ForeignKey

# ── Connection Setup ────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./skillrank.db")

# ADD THIS LINE RIGHT HERE:
print(f"🔌 DATABASE CONNECTED TO: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
# Automatically switch settings based on SQLite (Local) vs MySQL (Cloud)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# ── Database Initialization ──────────────────────────────────────────────────
def init_db():
    # We use SQLAlchemy MetaData to create tables so it automatically 
    # handles the syntax differences between SQLite and MySQL.
    metadata = MetaData()

    Table('users', metadata,
        Column('user_id', String(255), primary_key=True),
        Column('name', String(255), nullable=False),
        Column('global_score', Integer, default=0, nullable=False),
        Column('created_at', Float, nullable=False)
    )

    Table('sessions', metadata,
        Column('session_id', String(255), primary_key=True),
        Column('user_id', String(255), ForeignKey('users.user_id'), nullable=False),
        Column('session_score', Integer, default=0, nullable=False),
        Column('last_reply_time', Float, default=0, nullable=False),
        Column('last_word_count', Integer, default=0, nullable=False),
        Column('in_bluff_trap', Integer, default=0, nullable=False),
        Column('created_at', Float, nullable=False)
    )

    Table('messages', metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('session_id', String(255), ForeignKey('sessions.session_id'), nullable=False),
        Column('role', String(50), nullable=False),
        Column('content', Text, nullable=False),
        Column('created_at', Float, nullable=False)
    )

    # This creates the tables if they don't exist
    metadata.create_all(engine)


# ── User helpers ──────────────────────────────────────────────────────────────
def get_user(user_id: str):
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM users WHERE user_id = :u"), {"u": user_id}).mappings().first()
        return dict(result) if result else None

def create_user(user_id: str, name: str):
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO users (user_id, name, global_score, created_at) VALUES (:u, :n, 0, :c)"),
            {"u": user_id, "n": name, "c": time.time()}
        )

def update_global_score(user_id: str, delta: int):
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET global_score = global_score + :d WHERE user_id = :u"),
            {"d": delta, "u": user_id}
        )

def get_global_score(user_id: str) -> int:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT global_score FROM users WHERE user_id = :u"), {"u": user_id}).scalar()
        return result if result is not None else 0


# ── Session helpers ───────────────────────────────────────────────────────────
def get_session(session_id: str):
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM sessions WHERE session_id = :s"), {"s": session_id}).mappings().first()
        return dict(result) if result else None

def create_session(session_id: str, user_id: str):
    with engine.begin() as conn:
        conn.execute(
            text("""INSERT INTO sessions
                   (session_id, user_id, session_score, last_reply_time, last_word_count, in_bluff_trap, created_at)
                   VALUES (:s, :u, 0, 0, 0, 0, :c)"""),
            {"s": session_id, "u": user_id, "c": time.time()}
        )

def update_session(session_id: str, **kwargs):
    if not kwargs:
        return
    # Translates dict kwargs into secure SQL bindings
    fields = ", ".join(f"{k} = :{k}" for k in kwargs)
    kwargs["_session_id"] = session_id
    
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE sessions SET {fields} WHERE session_id = :_session_id"), kwargs)


# ── Message helpers ───────────────────────────────────────────────────────────
MAX_HISTORY = 20

def append_message(session_id: str, role: str, content: str):
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO messages (session_id, role, content, created_at) VALUES (:s, :r, :c, :t)"),
            {"s": session_id, "r": role, "c": content, "t": time.time()}
        )

def get_history(session_id: str) -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("""SELECT role, content FROM messages
                   WHERE session_id = :s
                   ORDER BY created_at DESC
                   LIMIT :lim"""),
            {"s": session_id, "lim": MAX_HISTORY * 2}
        ).mappings().fetchall()
        
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]