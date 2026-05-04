from fastapi import APIRouter, Depends, HTTPException, Response
import asyncpg
from pydantic import BaseModel, Field
from app.database import get_pool
from app.models import ConfigItem
from app.auth import get_current_user

router = APIRouter(tags=["config"])


class ColorUpdate(BaseModel):
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')


def _make_config_routes(prefix: str, table: str, project_field: str | None = None):
    """
    Returns (list, create, update_color, delete) route handlers for a config table.
    project_field: projects column to check before delete (None = no check).
    """
    async def list_items(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
        rows = await pool.fetch(f"SELECT name, color FROM {table} WHERE user_id=$1 ORDER BY name", user["id"])
        return [dict(r) for r in rows]

    async def create_item(body: ConfigItem, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
        try:
            row = await pool.fetchrow(
                f"INSERT INTO {table} (name, color, user_id) VALUES ($1,$2,$3) RETURNING name, color",
                body.name.strip(), body.color, user["id"],
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail=f"{table.rstrip('s').capitalize()} already exists")

    async def update_color(name: str, body: ColorUpdate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
        row = await pool.fetchrow(
            f"UPDATE {table} SET color=$1 WHERE name=$2 AND user_id=$3 RETURNING name, color",
            body.color, name, user["id"],
        )
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return dict(row)

    async def delete_item(name: str, force: bool = False, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
        if project_field:
            if force:
                await pool.execute(f"UPDATE projects SET {project_field}='' WHERE {project_field}=$1 AND user_id=$2", name, user["id"])
            else:
                count = await pool.fetchval(
                    f"SELECT COUNT(*) FROM projects WHERE {project_field}=$1 AND user_id=$2", name, user["id"]
                )
                if count:
                    raise HTTPException(status_code=409, detail=f"Cannot delete: used by {count} project(s)")
        result = await pool.execute(f"DELETE FROM {table} WHERE name=$1 AND user_id=$2", name, user["id"])
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Not found")
        return Response(status_code=204)

    return list_items, create_item, update_color, delete_item


# --- Brands (delete cascades to projects via force flag) ---
async def _list_brands(pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    rows = await pool.fetch("SELECT name, color FROM brands WHERE user_id=$1 ORDER BY name", user["id"])
    return [dict(r) for r in rows]

async def _create_brand(body: ConfigItem, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    try:
        row = await pool.fetchrow(
            "INSERT INTO brands (name, color, user_id) VALUES ($1,$2,$3) RETURNING name, color",
            body.name.strip(), body.color, user["id"],
        )
        return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Brand already exists")

async def _update_brand(name: str, body: ColorUpdate, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    row = await pool.fetchrow(
        "UPDATE brands SET color=$1 WHERE name=$2 AND user_id=$3 RETURNING name, color",
        body.color, name, user["id"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Brand not found")
    return dict(row)

async def _delete_brand(name: str, force: bool = False, pool: asyncpg.Pool = Depends(get_pool), user: dict = Depends(get_current_user)):
    if force:
        await pool.execute("DELETE FROM projects WHERE brand=$1 AND user_id=$2", name, user["id"])
    else:
        count = await pool.fetchval("SELECT COUNT(*) FROM projects WHERE brand=$1 AND user_id=$2", name, user["id"])
        if count:
            raise HTTPException(status_code=409, detail=f"Cannot delete: used by {count} project(s)")
    result = await pool.execute("DELETE FROM brands WHERE name=$1 AND user_id=$2", name, user["id"])
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Brand not found")
    return Response(status_code=204)

router.get("/api/brands", response_model=list[ConfigItem])(_list_brands)
router.post("/api/brands", response_model=ConfigItem, status_code=201)(_create_brand)
router.patch("/api/brands/{name}", response_model=ConfigItem)(_update_brand)
router.delete("/api/brands/{name}", status_code=204)(_delete_brand)


# --- Internal Statuses ---
_ls, _cs, _us, _ds = _make_config_routes("/api/statuses", "statuses", "internal_status")
router.get("/api/statuses", response_model=list[ConfigItem])(_ls)
router.post("/api/statuses", response_model=ConfigItem, status_code=201)(_cs)
router.patch("/api/statuses/{name}", response_model=ConfigItem)(_us)
router.delete("/api/statuses/{name}", status_code=204)(_ds)

# --- Client Statuses ---
_lcs, _ccs, _ucs, _dcs = _make_config_routes("/api/client-statuses", "client_statuses", "client_status")
router.get("/api/client-statuses", response_model=list[ConfigItem])(_lcs)
router.post("/api/client-statuses", response_model=ConfigItem, status_code=201)(_ccs)
router.patch("/api/client-statuses/{name}", response_model=ConfigItem)(_ucs)
router.delete("/api/client-statuses/{name}", status_code=204)(_dcs)

# --- Assignees ---
_la, _ca, _ua, _da = _make_config_routes("/api/assignees", "assignees", "assignee")
router.get("/api/assignees", response_model=list[ConfigItem])(_la)
router.post("/api/assignees", response_model=ConfigItem, status_code=201)(_ca)
router.patch("/api/assignees/{name}", response_model=ConfigItem)(_ua)
router.delete("/api/assignees/{name}", status_code=204)(_da)

# --- Priorities ---
_lp, _cp, _up, _dp = _make_config_routes("/api/priorities", "priorities", "priority")
router.get("/api/priorities", response_model=list[ConfigItem])(_lp)
router.post("/api/priorities", response_model=ConfigItem, status_code=201)(_cp)
router.patch("/api/priorities/{name}", response_model=ConfigItem)(_up)
router.delete("/api/priorities/{name}", status_code=204)(_dp)
