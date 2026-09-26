"""Therapist directory tests (used by parents to pick a therapist for their child)."""
import uuid

import pytest


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _register(client, role="parent", password="TestPass123!", full_name="Test User"):
    email = f"{uuid.uuid4().hex}@example.com"
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name, "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json(), email, password


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_parent_can_list_therapists(client):
    therapist_user, _, _ = await _register(client, role="therapist")
    _, parent_email, parent_password = await _register(client, role="parent")
    parent_token = await _login(client, parent_email, parent_password)

    resp = await client.get("/therapists", headers=_auth_headers(parent_token))
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert therapist_user["id"] in ids
    for t in resp.json():
        assert set(t.keys()) == {"id", "full_name"}


@pytest.mark.asyncio
async def test_therapist_directory_excludes_non_therapists(client):
    _, parent_email, parent_password = await _register(client, role="parent", full_name="Excluded Parent Name")
    other_parent_user, other_email, other_password = await _register(
        client, role="parent", full_name="Second Excluded Parent"
    )
    parent_token = await _login(client, other_email, other_password)

    resp = await client.get("/therapists", headers=_auth_headers(parent_token))
    assert resp.status_code == 200
    names = {t["full_name"] for t in resp.json()}
    assert "Excluded Parent Name" not in names
    assert "Second Excluded Parent" not in names


@pytest.mark.asyncio
async def test_therapist_directory_requires_auth(client):
    resp = await client.get("/therapists")
    assert resp.status_code == 401
