import os
from contextlib import asynccontextmanager
from uuid import UUID
import asyncpg
from fastapi import FastAPI

_pool: asyncpg.Pool | None = None

DEFAULT_BRANDS = [
    ("MDLZ", "#7F77DD"),
    ("SWISSE", "#1D9E75"),
    ("BRAND", "#D85A30"),
]

DEFAULT_STATUSES = [
    ("Done", "#1D9E75"),
    ("In Progress", "#2B7FD4"),
    ("Review", "#C07D15"),
    ("Urgent", "#C0392B"),
]


async def seed_user_defaults(conn: asyncpg.Connection, user_id: UUID) -> None:
    for name, color in DEFAULT_BRANDS:
        await conn.execute(
            "INSERT INTO brands (name, color, user_id) VALUES ($1,$2,$3) ON CONFLICT (name,user_id) DO NOTHING",
            name, color, user_id,
        )
    for name, color in DEFAULT_STATUSES:
        await conn.execute(
            "INSERT INTO statuses (name, color, user_id) VALUES ($1,$2,$3) ON CONFLICT (name,user_id) DO NOTHING",
            name, color, user_id,
        )


async def _migrate(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(100) NOT NULL,
                password_hash TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """)
        await conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''
        """)

        # Create per-user brands table (idempotent)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS brands (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL,
                color VARCHAR(7) NOT NULL DEFAULT '#7F77DD',
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (name, user_id)
            )
        """)
        # If old brands table had name as PK (no user_id), drop and recreate
        has_user_id = await conn.fetchval("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='brands' AND column_name='user_id'
        """)
        if has_user_id is None:
            await conn.execute("DROP TABLE IF EXISTS brands CASCADE")
            await conn.execute("""
                CREATE TABLE brands (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(50) NOT NULL,
                    color VARCHAR(7) NOT NULL DEFAULT '#7F77DD',
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE (name, user_id)
                )
            """)

        # Create per-user statuses table (idempotent)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS statuses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL,
                color VARCHAR(7) NOT NULL DEFAULT '#888888',
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (name, user_id)
            )
        """)
        has_user_id2 = await conn.fetchval("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='statuses' AND column_name='user_id'
        """)
        if has_user_id2 is None:
            await conn.execute("DROP TABLE IF EXISTS statuses CASCADE")
            await conn.execute("""
                CREATE TABLE statuses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(50) NOT NULL,
                    color VARCHAR(7) NOT NULL DEFAULT '#888888',
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE (name, user_id)
                )
            """)

        # Add user_id column to projects if not present
        await conn.execute("""
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)
        """)

        # Drop old CHECK constraints on projects
        rows = await conn.fetch("""
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'projects'::regclass AND contype = 'c'
        """)
        for row in rows:
            await conn.execute(f'ALTER TABLE projects DROP CONSTRAINT IF EXISTS "{row["conname"]}"')

        # Widen brand/status columns if needed
        await conn.execute("""
            ALTER TABLE projects
            ALTER COLUMN brand TYPE VARCHAR(50),
            ALTER COLUMN status TYPE VARCHAR(50)
        """)

        # Seed defaults for existing users who have none
        users = await conn.fetch("SELECT id FROM users")
        for u in users:
            count = await conn.fetchval("SELECT COUNT(*) FROM brands WHERE user_id=$1", u["id"])
            if count == 0:
                await seed_user_defaults(conn, u["id"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    _pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
    await _migrate(_pool)
    yield
    await _pool.close()


async def get_pool() -> asyncpg.Pool:
    return _pool
