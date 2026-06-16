from fastapi import APIRouter
from pydantic import BaseModel
from database.memory_db import get_user, create_user, get_global_score

router = APIRouter()


class LoginRequest(BaseModel):
    student_id: str
    name: str


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