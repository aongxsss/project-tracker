import os
from datetime import datetime, timedelta
from uuid import UUID
import bcrypt
from jose import JWTError, jwt
from fastapi import Request, HTTPException, Depends
import asyncpg
from app.database import get_pool

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
COOKIE_NAME = "access_token"
EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(
    request: Request,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    row = await pool.fetchrow(
        "SELECT id, username, display_name FROM users WHERE id=$1", UUID(user_id)
    )
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(row)
