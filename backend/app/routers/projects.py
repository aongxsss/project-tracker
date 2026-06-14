from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
import asyncpg
from app.database import get_pool
from app.models import Project, ProjectCreate, ProjectUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])

_COLS = "id, brand, customer_name, name, start_date, due_date, internal_status, client_status, assignee, priority, comment, description, final_link, created_at"


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


@router.get("", response_model=list[Project])
async def list_projects(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    rows = await pool.fetch(
        f"SELECT {_COLS} FROM projects WHERE user_id=$1 ORDER BY created_at DESC",
        user["id"],
    )
    return [_row_to_dict(r) for r in rows]


@router.post("", response_model=Project, status_code=201)
async def create_project(body: ProjectCreate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    row = await pool.fetchrow(
        f"""
        INSERT INTO projects (brand, customer_name, name, start_date, due_date, internal_status, client_status, assignee, priority, comment, description, final_link, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING {_COLS}
        """,
        body.brand, body.customer_name, body.name, body.start_date, body.due_date,
        body.internal_status, body.client_status, body.assignee, body.priority,
        body.comment, body.description, body.final_link, user["id"],
    )
    return _row_to_dict(row)


@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    pool: asyncpg.Pool = Depends(get_pool),
    user: dict = Depends(get_current_user),
):
    row = await pool.fetchrow(
        f"""
        UPDATE projects
        SET brand=$1, customer_name=$2, name=$3, start_date=$4, due_date=$5,
            internal_status=$6, client_status=$7, assignee=$8, priority=$9, comment=$10, description=$11, final_link=$12
        WHERE id=$13 AND user_id=$14
        RETURNING {_COLS}
        """,
        body.brand, body.customer_name, body.name, body.start_date, body.due_date,
        body.internal_status, body.client_status, body.assignee, body.priority,
        body.comment, body.description, body.final_link, project_id, user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return _row_to_dict(row)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: UUID, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    result = await pool.execute(
        "DELETE FROM projects WHERE id=$1 AND user_id=$2", project_id, user["id"]
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Project not found")
    return Response(status_code=204)
