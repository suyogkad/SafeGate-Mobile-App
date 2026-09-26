"""Shared test fixtures.

Each test runs inside its own database transaction (via a savepoint), which is
rolled back afterward -- so tests run against the real local Postgres without
ever persisting data or touching the seeded dev rows.

A fresh engine is created per test rather than reusing the app's module-level
engine: asyncpg connections are bound to the event loop that created them, and
pytest-asyncio gives each test its own loop, so reusing one pooled engine
across tests causes "attached to a different loop" errors.
"""
import os

# Force the mock AI provider for the whole test session, regardless of what a
# developer's local .env has set for real app usage. This MUST run before any
# app.* import below, since several modules call get_settings() (a cached
# singleton) at import time. Without this, AI_PROVIDER=<real> in .env would
# silently make the entire test suite call the real API -- exactly what
# happened once already (real-network flakiness in tests unrelated to the
# opt-in accuracy report). The opt-in test reads the real key independently.
os.environ["AI_PROVIDER"] = "mock"
# Existing tests register therapists via the public endpoint; approval is tested separately.
os.environ["THERAPIST_AUTO_APPROVE"] = "true"

import app.scheduler as scheduler_module
import pytest_asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import get_settings
from app.db.session import get_db
from app.main import app


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(get_settings().database_url)
    try:
        async with engine.connect() as conn:
            trans = await conn.begin()
            session = AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
            try:
                yield session
            finally:
                await session.close()
                await trans.rollback()
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    # The real scheduler singleton binds to whichever event loop is running
    # when it starts. pytest-asyncio gives each test its own loop, so a
    # shared singleton can't be restarted across tests (its old loop is
    # already closed by the next test). Give each test its own scheduler
    # instance instead, swapped in via the module (app.reminders looks it up
    # dynamically through `app.scheduler.scheduler`, not a copied name).
    scheduler_module.scheduler = AsyncIOScheduler()
    scheduler_module.scheduler.start()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

    scheduler_module.scheduler.shutdown(wait=False)
