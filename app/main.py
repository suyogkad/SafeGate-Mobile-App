"""FastAPI application entry point.

This is a support and learning tool, not a therapy, treatment, or monitoring
service. Routers are added in later build stages.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import runtime_settings
from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.routers import (
    admin,
    admin_ops,
    auth,
    child_access,
    children,
    companion,
    notes,
    safety,
    schedules,
    sessions,
    therapist,
    therapists,
)
from app.scheduler import scheduler

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with AsyncSessionLocal() as db:
            await runtime_settings.load_overrides(db)
    except Exception:
        logger.warning("Could not load stored settings; using environment defaults")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="SafeGate API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

app.include_router(auth.router)
app.include_router(children.router)
app.include_router(child_access.router)
app.include_router(admin.router)
app.include_router(admin_ops.router)
app.include_router(sessions.router)
app.include_router(schedules.router)
app.include_router(companion.router)
app.include_router(notes.router)
app.include_router(safety.router)
app.include_router(therapists.router)
app.include_router(therapist.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
