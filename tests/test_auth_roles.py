"""Auth flow and role-access rule tests (Stage 2)."""
import uuid

import pytest
from sqlalchemy import select

from app.db.models import ChildAccessLog, User, UserRole
from app.security import hash_password

CHILD_PAYLOAD = {
    "full_name": "Test Child",
    "emergency_contact_name": "Emergency Contact",
    "emergency_contact_phone": "+61 400 000 000",
    "home_address": "1 Test Street, Sydney NSW",
}


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _register(client, role="parent", password="TestPass123!"):
    email = f"{uuid.uuid4().hex}@example.com"
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Test User", "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json(), email, password


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_register_and_login(client):
    user, email, password = await _register(client, role="parent")
    assert user["role"] == "parent"
    token = await _login(client, email, password)
    assert token


@pytest.mark.asyncio
async def test_me_returns_current_user(client):
    user, email, password = await _register(client, role="parent")
    token = await _login(client, email, password)
    resp = await client.get("/auth/me", headers=_auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == user["id"]
    assert resp.json()["email"] == email


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_cannot_self_register_as_admin(client):
    resp = await client.post(
        "/auth/register",
        json={
            "email": f"{uuid.uuid4().hex}@example.com",
            "password": "TestPass123!",
            "full_name": "X",
            "role": "admin",
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_duplicate_email_rejected(client):
    _, email, password = await _register(client, role="parent")
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Dup", "role": "parent"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_wrong_password_rejected(client):
    _, email, _ = await _register(client, role="parent")
    resp = await client.post("/auth/login", data={"username": email, "password": "WrongPass1!"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client):
    resp = await client.get("/children")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_parent_cannot_read_another_parents_child(client):
    _, email_a, password_a = await _register(client, role="parent")
    token_a = await _login(client, email_a, password_a)
    _, email_b, password_b = await _register(client, role="parent")
    token_b = await _login(client, email_b, password_b)

    create_resp = await client.post("/children", json=CHILD_PAYLOAD, headers=_auth_headers(token_a))
    assert create_resp.status_code == 201, create_resp.text
    child_id = create_resp.json()["id"]

    resp = await client.get(f"/children/{child_id}", headers=_auth_headers(token_b))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_therapist_cannot_read_unassigned_child(client):
    _, email_parent, password_parent = await _register(client, role="parent")
    token_parent = await _login(client, email_parent, password_parent)
    _, email_therapist, password_therapist = await _register(client, role="therapist")
    token_therapist = await _login(client, email_therapist, password_therapist)

    create_resp = await client.post("/children", json=CHILD_PAYLOAD, headers=_auth_headers(token_parent))
    child_id = create_resp.json()["id"]

    resp = await client.get(f"/children/{child_id}", headers=_auth_headers(token_therapist))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_assigned_therapist_can_read_child(client):
    _, email_parent, password_parent = await _register(client, role="parent")
    token_parent = await _login(client, email_parent, password_parent)
    therapist_user, email_therapist, password_therapist = await _register(client, role="therapist")
    token_therapist = await _login(client, email_therapist, password_therapist)

    payload = {**CHILD_PAYLOAD, "therapist_id": therapist_user["id"]}
    create_resp = await client.post("/children", json=payload, headers=_auth_headers(token_parent))
    assert create_resp.status_code == 201, create_resp.text
    assert create_resp.json()["therapist_name"] == therapist_user["full_name"]
    child_id = create_resp.json()["id"]

    resp = await client.get(f"/children/{child_id}", headers=_auth_headers(token_therapist))
    assert resp.status_code == 200
    assert resp.json()["id"] == child_id


@pytest.mark.asyncio
async def test_admin_can_read_any_child(client, db_session):
    admin = User(
        email=f"{uuid.uuid4().hex}@example.com",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        full_name="Admin Test",
    )
    db_session.add(admin)
    await db_session.commit()
    token_admin = await _login(client, admin.email, "AdminPass123!")

    _, email_parent, password_parent = await _register(client, role="parent")
    token_parent = await _login(client, email_parent, password_parent)
    create_resp = await client.post("/children", json=CHILD_PAYLOAD, headers=_auth_headers(token_parent))
    child_id = create_resp.json()["id"]

    resp = await client.get(f"/children/{child_id}", headers=_auth_headers(token_admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_parent_can_edit_own_child_but_not_others(client):
    _, email_a, password_a = await _register(client, role="parent")
    token_a = await _login(client, email_a, password_a)
    _, email_b, password_b = await _register(client, role="parent")
    token_b = await _login(client, email_b, password_b)

    create_resp = await client.post("/children", json=CHILD_PAYLOAD, headers=_auth_headers(token_a))
    child_id = create_resp.json()["id"]

    own_update = await client.put(
        f"/children/{child_id}", json={"full_name": "Updated Name"}, headers=_auth_headers(token_a)
    )
    assert own_update.status_code == 200
    assert own_update.json()["full_name"] == "Updated Name"

    other_update = await client.put(
        f"/children/{child_id}", json={"full_name": "Hijacked"}, headers=_auth_headers(token_b)
    )
    assert other_update.status_code == 403


@pytest.mark.asyncio
async def test_child_access_is_logged(client, db_session):
    _, email_parent, password_parent = await _register(client, role="parent")
    token_parent = await _login(client, email_parent, password_parent)

    create_resp = await client.post("/children", json=CHILD_PAYLOAD, headers=_auth_headers(token_parent))
    child_id = create_resp.json()["id"]

    resp = await client.get(f"/children/{child_id}", headers=_auth_headers(token_parent))
    assert resp.status_code == 200

    result = await db_session.execute(
        select(ChildAccessLog).where(ChildAccessLog.child_id == uuid.UUID(child_id))
    )
    actions = {row.action for row in result.scalars().all()}
    assert "create" in actions
    assert "view" in actions
