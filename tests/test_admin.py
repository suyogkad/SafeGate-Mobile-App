"""Admin user-management tests (Stage 2 follow-up)."""
import uuid

import pytest

from app.db.models import User, UserRole
from app.security import hash_password


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_admin(db_session) -> User:
    admin = User(
        email=f"{uuid.uuid4().hex}@example.com",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        full_name="Admin Test",
    )
    db_session.add(admin)
    await db_session.commit()
    return admin


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def _register(client, role="parent", password="TestPass123!"):
    email = f"{uuid.uuid4().hex}@example.com"
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Test User", "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json(), email, password


@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_routes(client):
    _, email, password = await _register(client, role="parent")
    token = await _login(client, email, password)

    resp = await client.get("/admin/users", headers=_auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_create_user_including_admin_role(client, db_session):
    admin = await _create_admin(db_session)
    token_admin = await _login(client, admin.email, "AdminPass123!")

    resp = await client.post(
        "/admin/users",
        json={
            "email": f"{uuid.uuid4().hex}@example.com",
            "password": "NewAdminPass123!",
            "full_name": "New Admin",
            "role": "admin",
        },
        headers=_auth_headers(token_admin),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_admin_can_list_and_filter_users(client, db_session):
    admin = await _create_admin(db_session)
    token_admin = await _login(client, admin.email, "AdminPass123!")
    await _register(client, role="therapist")

    resp = await client.get("/admin/users", params={"role": "therapist"}, headers=_auth_headers(token_admin))
    assert resp.status_code == 200
    assert all(u["role"] == "therapist" for u in resp.json())
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_admin_can_deactivate_user_and_login_is_blocked(client, db_session):
    admin = await _create_admin(db_session)
    token_admin = await _login(client, admin.email, "AdminPass123!")

    user, email, password = await _register(client, role="parent")
    token_before = await _login(client, email, password)
    assert token_before

    patch_resp = await client.patch(
        f"/admin/users/{user['id']}", json={"is_active": False}, headers=_auth_headers(token_admin)
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["is_active"] is False

    login_resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert login_resp.status_code == 401

    me_resp = await client.get("/children", headers=_auth_headers(token_before))
    assert me_resp.status_code == 401


@pytest.mark.asyncio
async def test_get_and_update_nonexistent_user_404s(client, db_session):
    admin = await _create_admin(db_session)
    token_admin = await _login(client, admin.email, "AdminPass123!")

    fake_id = uuid.uuid4()
    resp = await client.get(f"/admin/users/{fake_id}", headers=_auth_headers(token_admin))
    assert resp.status_code == 404
