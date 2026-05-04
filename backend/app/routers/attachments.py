from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from pydantic import BaseModel
import asyncpg
from app.database import get_pool
from app.auth import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/attachments", tags=["attachments"])

MAX_BYTES = 10 * 1024 * 1024  # 10 MB


class AttachmentOut(BaseModel):
    id: str
    project_id: str
    original_name: str
    content_type: str
    file_size: int
    created_at: str


def _row(r: asyncpg.Record) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]),
        "original_name": r["original_name"],
        "content_type": r["content_type"],
        "file_size": r["file_size"],
        "created_at": r["created_at"].isoformat(),
    }


async def _check_project(pool: asyncpg.Pool, project_id: UUID, user_id) -> None:
    proj = await pool.fetchrow("SELECT id FROM projects WHERE id=$1 AND user_id=$2", project_id, user_id)
    if proj is None:
        raise HTTPException(status_code=404, detail="Project not found")


@router.get("", response_model=list[AttachmentOut])
async def list_attachments(
    project_id: UUID,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    await _check_project(pool, project_id, user["id"])
    rows = await pool.fetch(
        "SELECT id, project_id, original_name, content_type, file_size, created_at FROM project_attachments WHERE project_id=$1 ORDER BY created_at DESC",
        project_id,
    )
    return [_row(r) for r in rows]


@router.post("", response_model=AttachmentOut, status_code=201)
async def upload_attachment(
    project_id: UUID,
    file: UploadFile = File(...),
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    await _check_project(pool, project_id, user["id"])
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    row = await pool.fetchrow(
        """INSERT INTO project_attachments (project_id, user_id, original_name, content_type, file_size, data)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, project_id, original_name, content_type, file_size, created_at""",
        project_id, user["id"],
        file.filename or "upload",
        file.content_type or "application/octet-stream",
        len(data), data,
    )
    return _row(row)


@router.get("/{attachment_id}/download")
async def download_attachment(
    project_id: UUID,
    attachment_id: UUID,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    await _check_project(pool, project_id, user["id"])
    row = await pool.fetchrow(
        "SELECT original_name, content_type, data FROM project_attachments WHERE id=$1 AND project_id=$2",
        attachment_id, project_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return Response(
        content=bytes(row["data"]),
        media_type=row["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{row["original_name"]}"'},
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    project_id: UUID,
    attachment_id: UUID,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    await _check_project(pool, project_id, user["id"])
    result = await pool.execute(
        "DELETE FROM project_attachments WHERE id=$1 AND project_id=$2",
        attachment_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Attachment not found")
    return Response(status_code=204)
