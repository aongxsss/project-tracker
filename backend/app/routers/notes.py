from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
import asyncpg
from app.database import get_pool
from app.auth import get_current_user

router = APIRouter(prefix="/api/notes", tags=["notes"])

_COLS = "id, title, content, color, pinned, position, created_at, updated_at"


class NoteOut(BaseModel):
    id: str
    title: str
    content: str
    color: str
    pinned: bool
    position: int
    created_at: str
    updated_at: str


class NoteCreate(BaseModel):
    title: str = ""
    content: str = ""
    color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    pinned: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    pinned: Optional[bool] = None


class ReorderItem(BaseModel):
    id: str
    position: int
    pinned: bool


class ReorderBody(BaseModel):
    items: list[ReorderItem]


def _row_to_dict(row: asyncpg.Record) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    return d


@router.get("", response_model=list[NoteOut])
async def list_notes(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    rows = await pool.fetch(
        f"SELECT {_COLS} FROM notes WHERE user_id=$1 ORDER BY pinned DESC, position ASC, created_at DESC",
        user["id"],
    )
    return [_row_to_dict(r) for r in rows]


@router.post("", response_model=NoteOut, status_code=201)
async def create_note(body: NoteCreate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    next_pos = await pool.fetchval(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM notes WHERE user_id=$1 AND pinned=$2",
        user["id"], body.pinned,
    )
    row = await pool.fetchrow(
        f"""
        INSERT INTO notes (user_id, title, content, color, pinned, position)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING {_COLS}
        """,
        user["id"], body.title, body.content, body.color, body.pinned, next_pos,
    )
    return _row_to_dict(row)


@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: UUID,
    body: NoteUpdate,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    sets = []
    values: list = []
    idx = 1
    for field in ("title", "content", "color", "pinned"):
        v = getattr(body, field)
        if v is not None:
            sets.append(f"{field}=${idx}")
            values.append(v)
            idx += 1
    if not sets:
        row = await pool.fetchrow(f"SELECT {_COLS} FROM notes WHERE id=$1 AND user_id=$2", note_id, user["id"])
        if row is None:
            raise HTTPException(status_code=404, detail="Note not found")
        return _row_to_dict(row)

    sets.append(f"updated_at=now()")
    values.extend([note_id, user["id"]])
    sql = f"UPDATE notes SET {', '.join(sets)} WHERE id=${idx} AND user_id=${idx + 1} RETURNING {_COLS}"
    row = await pool.fetchrow(sql, *values)
    if row is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return _row_to_dict(row)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: UUID, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    result = await pool.execute("DELETE FROM notes WHERE id=$1 AND user_id=$2", note_id, user["id"])
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Note not found")
    return Response(status_code=204)


@router.patch("/reorder/batch")
async def reorder_notes(
    body: ReorderBody,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    async with pool.acquire() as conn:
        async with conn.transaction():
            for item in body.items:
                await conn.execute(
                    "UPDATE notes SET position=$1, pinned=$2, updated_at=now() WHERE id=$3 AND user_id=$4",
                    item.position, item.pinned, UUID(item.id), user["id"],
                )
    return {"status": "ok"}
