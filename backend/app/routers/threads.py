from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
import asyncpg
from app.database import get_pool
from app.auth import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/threads", tags=["threads"])


class ThreadOut(BaseModel):
    id: str
    project_id: str
    display_name: str
    message: str
    created_at: str


class ThreadCreate(BaseModel):
    message: str


def _row(r: asyncpg.Record) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]),
        "display_name": r["display_name"],
        "message": r["message"],
        "created_at": r["created_at"].isoformat(),
    }


@router.get("", response_model=list[ThreadOut])
async def list_threads(
    project_id: UUID,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    proj = await pool.fetchrow("SELECT id FROM projects WHERE id=$1 AND user_id=$2", project_id, user["id"])
    if proj is None:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = await pool.fetch(
        "SELECT id, project_id, display_name, message, created_at FROM project_threads WHERE project_id=$1 ORDER BY created_at ASC",
        project_id,
    )
    return [_row(r) for r in rows]


@router.post("", response_model=ThreadOut, status_code=201)
async def create_thread(
    project_id: UUID,
    body: ThreadCreate,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    proj = await pool.fetchrow("SELECT id FROM projects WHERE id=$1 AND user_id=$2", project_id, user["id"])
    if proj is None:
        raise HTTPException(status_code=404, detail="Project not found")
    row = await pool.fetchrow(
        """INSERT INTO project_threads (project_id, user_id, display_name, message)
           VALUES ($1, $2, $3, $4)
           RETURNING id, project_id, display_name, message, created_at""",
        project_id, user["id"], user["display_name"], body.message,
    )
    return _row(row)


@router.delete("/{thread_id}", status_code=204)
async def delete_thread(
    project_id: UUID,
    thread_id: UUID,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    result = await pool.execute(
        "DELETE FROM project_threads WHERE id=$1 AND user_id=$2 AND project_id=$3",
        thread_id, user["id"], project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Thread not found")
    return Response(status_code=204)
