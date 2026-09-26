"""Visual schedule CRUD and access-rule tests (Stage 4)."""
import uuid

import pytest

CHILD_PAYLOAD = {
    "full_name": "Test Child",
    "emergency_contact_name": "Emergency Contact",
    "emergency_contact_phone": "+61 400 000 000",
    "home_address": "1 Test Street, Sydney NSW",
}

SCHEDULE_PAYLOAD = {
    "title": "Morning Routine",
    "items": [
        {"position": 1, "title": "Wake up", "image_url": "https://example.com/wake.png"},
        {"position": 2, "title": "Brush teeth", "image_url": "https://example.com/brush.png"},
    ],
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


async def _make_parent_with_child(client, therapist_id: str | None = None):
    _, email, password = await _register(client, role="parent")
    token = await _login(client, email, password)
    payload = {**CHILD_PAYLOAD, "therapist_id": therapist_id} if therapist_id else CHILD_PAYLOAD
    resp = await client.post("/children", json=payload, headers=_auth_headers(token))
    assert resp.status_code == 201, resp.text
    return token, resp.json()


async def _make_therapist(client):
    user, email, password = await _register(client, role="therapist")
    token = await _login(client, email, password)
    return token, user


@pytest.mark.asyncio
async def test_parent_can_create_and_view_schedule(client):
    parent_token, child = await _make_parent_with_child(client)

    create_resp = await client.post(
        f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(parent_token)
    )
    assert create_resp.status_code == 201, create_resp.text
    body = create_resp.json()
    assert body["title"] == "Morning Routine"
    assert len(body["items"]) == 2
    assert body["items"][0]["title"] == "Wake up"

    get_resp = await client.get(
        f"/children/{child['id']}/schedules/{body['id']}", headers=_auth_headers(parent_token)
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == body["id"]


@pytest.mark.asyncio
async def test_assigned_therapist_can_create_schedule(client):
    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])

    resp = await client.post(
        f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(therapist_token)
    )
    assert resp.status_code == 201, resp.text


@pytest.mark.asyncio
async def test_unassigned_therapist_cannot_create_schedule(client):
    therapist_token, _ = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client)

    resp = await client.post(
        f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(therapist_token)
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_other_parent_cannot_view_schedule(client):
    parent_token, child = await _make_parent_with_child(client)
    other_parent_token, _ = await _make_parent_with_child(client)

    create_resp = await client.post(
        f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(parent_token)
    )
    schedule_id = create_resp.json()["id"]

    resp = await client.get(
        f"/children/{child['id']}/schedules/{schedule_id}", headers=_auth_headers(other_parent_token)
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_schedules_for_child(client):
    parent_token, child = await _make_parent_with_child(client)

    await client.post(f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(parent_token))
    await client.post(
        f"/children/{child['id']}/schedules",
        json={"title": "Bedtime Routine", "items": []},
        headers=_auth_headers(parent_token),
    )

    resp = await client.get(f"/children/{child['id']}/schedules", headers=_auth_headers(parent_token))
    assert resp.status_code == 200
    titles = {s["title"] for s in resp.json()}
    assert titles == {"Morning Routine", "Bedtime Routine"}


@pytest.mark.asyncio
async def test_update_schedule_replaces_items(client):
    parent_token, child = await _make_parent_with_child(client)

    create_resp = await client.post(
        f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(parent_token)
    )
    schedule_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/children/{child['id']}/schedules/{schedule_id}",
        json={"title": "Updated Routine", "items": [{"position": 1, "title": "New Step", "image_url": None}]},
        headers=_auth_headers(parent_token),
    )
    assert update_resp.status_code == 200, update_resp.text
    body = update_resp.json()
    assert body["title"] == "Updated Routine"
    assert len(body["items"]) == 1
    assert body["items"][0]["title"] == "New Step"


@pytest.mark.asyncio
async def test_delete_schedule(client):
    parent_token, child = await _make_parent_with_child(client)

    create_resp = await client.post(
        f"/children/{child['id']}/schedules", json=SCHEDULE_PAYLOAD, headers=_auth_headers(parent_token)
    )
    schedule_id = create_resp.json()["id"]

    delete_resp = await client.delete(
        f"/children/{child['id']}/schedules/{schedule_id}", headers=_auth_headers(parent_token)
    )
    assert delete_resp.status_code == 204

    get_resp = await client.get(
        f"/children/{child['id']}/schedules/{schedule_id}", headers=_auth_headers(parent_token)
    )
    assert get_resp.status_code == 404
