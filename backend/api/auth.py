import hashlib
import hmac
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.memory_db import get_user, create_user, get_global_score, set_user_password

router = APIRouter()


class LoginRequest(BaseModel):
    student_id: str
    name: str


class CredentialsRequest(BaseModel):
    email: str
    password: str
    is_login: bool = True


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return f"pbkdf2_sha256${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False

    try:
        algorithm, salt_hex, digest_hex = stored_hash.split("$", 2)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    candidate = hash_password(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(candidate, stored_hash)


@router.post("/login")
def login(req: LoginRequest):
    user_id = req.student_id.strip().lower()
    print(f"\n--- LOGIN: {user_id} ---")

    user = get_user(user_id)
    if not user:
        print("Creating new user...")
        create_user(user_id, req.name)
        message = f"Welcome, {req.name}! Profile created."
        name = req.name
    else:
        print("User found.")
        message = f"Welcome back, {user['name']}!"
        name = user["name"]

    return {
        "user_id": user_id,
        "name": name,
        "global_score": get_global_score(user_id),
        "message": message,
    }


@router.post("/auth/credentials")
def credentials_auth(req: CredentialsRequest):
    email = req.email.strip().lower()
    password = req.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = get_user(email)

    if req.is_login:
        if not user or not verify_password(password, user.get("password_hash")):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        return {
            "user_id": email,
            "name": user["name"],
            "email": email,
            "global_score": get_global_score(email),
        }

    if user:
        if user.get("password_hash"):
            raise HTTPException(status_code=409, detail="An account already exists for this email.")

        set_user_password(email, hash_password(password))
        name = user["name"]
    else:
        name = email.split("@", 1)[0]
        create_user(email, name, hash_password(password))

    return {
        "user_id": email,
        "name": name,
        "email": email,
        "global_score": get_global_score(email),
    }
