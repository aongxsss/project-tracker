import os
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, Field
import asyncpg
from app.database import get_pool, seed_user_defaults
from app.auth import hash_password, verify_password, create_token, get_current_user, COOKIE_NAME

_IS_PROD = os.environ.get("ENVIRONMENT", "development") == "production"

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9._-]+$")
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=_IS_PROD,
    )
    response.headers["Cache-Control"] = "no-store"


@router.get("/check-username")
async def check_username(username: str, pool: asyncpg.Pool = Depends(get_pool)):
    taken = await pool.fetchval(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username=$1)", username.lower().strip()
    )
    return {"taken": taken}


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterRequest, response: Response, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                """INSERT INTO users (username, display_name, password_hash)
                   VALUES ($1, $2, $3) RETURNING id, username, display_name""",
                body.username.lower().strip(),
                body.display_name.strip(),
                hash_password(body.password),
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Username already taken")
        await seed_user_defaults(conn, row["id"])
    _set_cookie(response, create_token(str(row["id"])))
    return {"id": str(row["id"]), "username": row["username"], "display_name": row["display_name"]}


@router.post("/login", response_model=UserOut)
async def login(body: LoginRequest, response: Response, pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow(
        "SELECT id, username, display_name, password_hash FROM users WHERE username=$1",
        body.username.lower().strip(),
    )
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    _set_cookie(response, create_token(str(row["id"])))
    return {"id": str(row["id"]), "username": row["username"], "display_name": row["display_name"]}


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user), pool: asyncpg.Pool = Depends(get_pool)):
    row = await pool.fetchrow("SELECT id, username, display_name FROM users WHERE id=$1", current_user["id"])
    return {"id": str(row["id"]), "username": row["username"], "display_name": row["display_name"]}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, httponly=True, samesite="lax", secure=_IS_PROD)
    return {"status": "ok"}
