import json
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
import asyncpg
from app.database import get_pool
from app.auth import get_current_user

router = APIRouter(prefix="/api/sheets", tags=["sheets"])


class SheetOut(BaseModel):
    id: str
    title: str
    columns: list[dict]
    rows: list[dict]
    merges: list[dict] = []
    position: int
    created_at: str
    updated_at: str


class SheetCreate(BaseModel):
    title: str = "Untitled Sheet"
    columns: list[dict] = []
    rows: list[dict] = []
    merges: list[dict] = []


class SheetUpdate(BaseModel):
    title: Optional[str] = None
    columns: Optional[list[dict]] = None
    rows: Optional[list[dict]] = None
    merges: Optional[list[dict]] = None


SELECT_COLS = "id, title, columns, rows, merges, position, created_at, updated_at"


def _row_to_dict(row: asyncpg.Record) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    for key in ("columns", "rows", "merges"):
        if isinstance(d.get(key), str):
            d[key] = json.loads(d[key])
        elif d.get(key) is None:
            d[key] = []
    return d


@router.get("", response_model=list[SheetOut])
async def list_sheets(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    rows = await pool.fetch(
        f"SELECT {SELECT_COLS} FROM sheets WHERE user_id=$1 ORDER BY position ASC, created_at DESC",
        user["id"],
    )
    return [_row_to_dict(r) for r in rows]


@router.post("", response_model=SheetOut, status_code=201)
async def create_sheet(body: SheetCreate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    next_pos = await pool.fetchval(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM sheets WHERE user_id=$1", user["id"]
    )
    row = await pool.fetchrow(
        f"""
        INSERT INTO sheets (user_id, title, columns, rows, merges, position)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6)
        RETURNING {SELECT_COLS}
        """,
        user["id"], body.title,
        json.dumps(body.columns), json.dumps(body.rows), json.dumps(body.merges), next_pos,
    )
    return _row_to_dict(row)


@router.patch("/{sheet_id}", response_model=SheetOut)
async def update_sheet(
    sheet_id: UUID,
    body: SheetUpdate,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    sets, values = [], []
    idx = 1
    if body.title is not None:
        sets.append(f"title=${idx}"); values.append(body.title); idx += 1
    if body.columns is not None:
        sets.append(f"columns=${idx}::jsonb"); values.append(json.dumps(body.columns)); idx += 1
    if body.rows is not None:
        sets.append(f"rows=${idx}::jsonb"); values.append(json.dumps(body.rows)); idx += 1
    if body.merges is not None:
        sets.append(f"merges=${idx}::jsonb"); values.append(json.dumps(body.merges)); idx += 1
    if not sets:
        row = await pool.fetchrow(
            f"SELECT {SELECT_COLS} FROM sheets WHERE id=$1 AND user_id=$2",
            sheet_id, user["id"],
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Sheet not found")
        return _row_to_dict(row)
    sets.append("updated_at=now()")
    values.extend([sheet_id, user["id"]])
    sql = f"UPDATE sheets SET {', '.join(sets)} WHERE id=${idx} AND user_id=${idx+1} RETURNING {SELECT_COLS}"
    row = await pool.fetchrow(sql, *values)
    if row is None:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return _row_to_dict(row)


@router.delete("/{sheet_id}", status_code=204)
async def delete_sheet(sheet_id: UUID, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    result = await pool.execute("DELETE FROM sheets WHERE id=$1 AND user_id=$2", sheet_id, user["id"])
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Sheet not found")
    return Response(status_code=204)
