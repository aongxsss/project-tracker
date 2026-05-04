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

DEFAULT_PRIORITIES = [
    ("High", "#C0392B"),
    ("Medium", "#C07D15"),
    ("Low", "#1D9E75"),
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
    for name, color in DEFAULT_PRIORITIES:
        await conn.execute(
            "INSERT INTO priorities (name, color, user_id) VALUES ($1,$2,$3) ON CONFLICT (name,user_id) DO NOTHING",
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

        # Per-user brands table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS brands (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL,
                color VARCHAR(7) NOT NULL DEFAULT '#7F77DD',
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (name, user_id)
            )
        """)
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

        # Per-user statuses table (used as internal statuses)
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

        # Client statuses table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS client_statuses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL,
                color VARCHAR(7) NOT NULL DEFAULT '#888888',
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (name, user_id)
            )
        """)

        # Assignees table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS assignees (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL,
                color VARCHAR(7) NOT NULL DEFAULT '#888888',
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (name, user_id)
            )
        """)

        # Priorities table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS priorities (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) NOT NULL,
                color VARCHAR(7) NOT NULL DEFAULT '#888888',
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (name, user_id)
            )
        """)

        # Create projects table if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                brand VARCHAR(50) NOT NULL,
                pm VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL,
                due_date DATE NOT NULL,
                comment TEXT NOT NULL DEFAULT '',
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """)

        # Add legacy user_id if missing
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

        # Add new project columns (idempotent)
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200) NOT NULL DEFAULT ''")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS internal_status VARCHAR(50) NOT NULL DEFAULT ''")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_status VARCHAR(50) NOT NULL DEFAULT ''")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS assignee VARCHAR(50) NOT NULL DEFAULT ''")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(50) NOT NULL DEFAULT ''")

        # Make legacy pm/status columns optional (no longer written by API)
        await conn.execute("ALTER TABLE projects ALTER COLUMN pm SET DEFAULT ''")
        await conn.execute("ALTER TABLE projects ALTER COLUMN status SET DEFAULT ''")

        # Migrate legacy data: copy pm → customer_name, status → internal_status
        await conn.execute("UPDATE projects SET customer_name = pm WHERE customer_name = ''")
        await conn.execute("UPDATE projects SET internal_status = status WHERE internal_status = ''")

        # Seed defaults for existing users who have none
        users = await conn.fetch("SELECT id FROM users")
        for u in users:
            count = await conn.fetchval("SELECT COUNT(*) FROM brands WHERE user_id=$1", u["id"])
            if count == 0:
                await seed_user_defaults(conn, u["id"])
            # Seed priorities for existing users who have none
            pcount = await conn.fetchval("SELECT COUNT(*) FROM priorities WHERE user_id=$1", u["id"])
            if pcount == 0:
                for name, color in DEFAULT_PRIORITIES:
                    await conn.execute(
                        "INSERT INTO priorities (name, color, user_id) VALUES ($1,$2,$3) ON CONFLICT (name,user_id) DO NOTHING",
                        name, color, u["id"],
                    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    _pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
    await _migrate(_pool)
    yield
    await _pool.close()


async def get_pool() -> asyncpg.Pool:
    return _pool
