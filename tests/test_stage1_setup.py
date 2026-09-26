"""Stage 1 checks: app boots, models import, expected tables exist."""
from fastapi.testclient import TestClient

from app.db.models import Base
from app.main import app

EXPECTED_TABLES = {
    "users",
    "children",
    "therapist_profiles",
    "availability_slots",
    "sessions",
    "session_notes",
    "visual_schedules",
    "schedule_items",
    "conversation_logs",
    "alerts",
    "child_access_logs",
}


def test_expected_tables_registered():
    assert EXPECTED_TABLES.issubset(set(Base.metadata.tables.keys()))


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
