from fastapi import APIRouter, Depends, HTTPException, Response
import asyncpg
from pydantic import BaseModel, Field
from app.database import get_pool
from app.models import ConfigItem
from app.auth import get_current_user

router = APIRouter(tags=["config"])


class ColorUpdate(BaseModel):
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')


@router.get("/api/brands", response_model=list[ConfigItem])
async def list_brands(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    rows = await pool.fetch(
        "SELECT name, color FROM brands WHERE user_id=$1 ORDER BY name", user["id"]
    )
    return [dict(r) for r in rows]


@router.post("/api/brands", response_model=ConfigItem, status_code=201)
async def create_brand(body: ConfigItem, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    try:
        row = await pool.fetchrow(
            "INSERT INTO brands (name, color, user_id) VALUES ($1,$2,$3) RETURNING name, color",
            body.name.strip(), body.color, user["id"],
        )
        return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Brand already exists")


@router.patch("/api/brands/{name}", response_model=ConfigItem)
async def update_brand_color(name: str, body: ColorUpdate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    row = await pool.fetchrow(
        "UPDATE brands SET color=$1 WHERE name=$2 AND user_id=$3 RETURNING name, color",
        body.color, name, user["id"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Brand not found")
    return dict(row)


@router.delete("/api/brands/{name}", status_code=204)
async def delete_brand(name: str, force: bool = False, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    if force:
        await pool.execute("DELETE FROM projects WHERE brand=$1 AND user_id=$2", name, user["id"])
    else:
        count = await pool.fetchval(
            "SELECT COUNT(*) FROM projects WHERE brand=$1 AND user_id=$2", name, user["id"]
        )
        if count:
            raise HTTPException(status_code=409, detail=f"Cannot delete: used by {count} task(s)")
    result = await pool.execute("DELETE FROM brands WHERE name=$1 AND user_id=$2", name, user["id"])
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Brand not found")
    return Response(status_code=204)


@router.get("/api/statuses", response_model=list[ConfigItem])
async def list_statuses(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    rows = await pool.fetch(
        "SELECT name, color FROM statuses WHERE user_id=$1 ORDER BY name", user["id"]
    )
    return [dict(r) for r in rows]


@router.post("/api/statuses", response_model=ConfigItem, status_code=201)
async def create_status(body: ConfigItem, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    try:
        row = await pool.fetchrow(
            "INSERT INTO statuses (name, color, user_id) VALUES ($1,$2,$3) RETURNING name, color",
            body.name.strip(), body.color, user["id"],
        )
        return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Status already exists")


@router.patch("/api/statuses/{name}", response_model=ConfigItem)
async def update_status_color(name: str, body: ColorUpdate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    row = await pool.fetchrow(
        "UPDATE statuses SET color=$1 WHERE name=$2 AND user_id=$3 RETURNING name, color",
        body.color, name, user["id"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Status not found")
    return dict(row)


@router.delete("/api/statuses/{name}", status_code=204)
async def delete_status(name: str, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    count = await pool.fetchval(
        "SELECT COUNT(*) FROM projects WHERE status=$1 AND user_id=$2", name, user["id"]
    )
    if count:
        raise HTTPException(status_code=409, detail=f"Cannot delete: used by {count} task(s)")
    result = await pool.execute("DELETE FROM statuses WHERE name=$1 AND user_id=$2", name, user["id"])
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Status not found")
    return Response(status_code=204)
