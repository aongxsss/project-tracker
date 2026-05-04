import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database import lifespan
from app.routers import projects, config, auth, notes, sheets

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

allowed_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app = FastAPI(title="Project Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    logger.info("%s %s %d %.1fms", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(config.router)
app.include_router(notes.router)
app.include_router(sheets.router)
