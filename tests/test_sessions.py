"""Scheduling and session tests (Stage 3): availability, booking, double-booking
prevention, reschedule, cancel, and reminder scheduling.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

import app.scheduler as scheduler_module

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


async def _create_slot(client, therapist_token, start_time=None):
    start_time = start_time or (datetime.now(timezone.utc) + timedelta(days=1))
    resp = await client.post(
        "/availability",
        json={"start_time": start_time.isoformat(), "end_time": (start_time + timedelta(hours=1)).isoformat()},
        headers=_auth_headers(therapist_token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_therapist_can_create_and_list_availability(client):
    therapist_token, therapist_user = await _make_therapist(client)
    slot = await _create_slot(client, therapist_token)

    resp = await client.get(f"/availability/{therapist_user['id']}", headers=_auth_headers(therapist_token))
    assert resp.status_code == 200
    assert any(s["id"] == slot["id"] for s in resp.json())


@pytest.mark.asyncio
async def test_non_therapist_cannot_create_availability(client):
    parent_token, _ = await _make_parent_with_child(client)
    resp = await client.post(
        "/availability",
        json={
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        },
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_can_book_session_with_assigned_therapist(client):
    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    slot = await _create_slot(client, therapist_token)

    resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "booked"
    assert body["video_room_url"] is not None
    assert body["child_name"] == child["full_name"]
    assert body["therapist_name"] == therapist_user["full_name"]

    # A reminder should now be scheduled for this session.
    job = scheduler_module.scheduler.get_job(f"session-reminder-{body['id']}")
    assert job is not None


@pytest.mark.asyncio
async def test_cannot_book_slot_belonging_to_different_therapist(client):
    therapist_token, therapist_user = await _make_therapist(client)
    other_therapist_token, other_therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    other_slot = await _create_slot(client, other_therapist_token)

    resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": other_slot["id"]},
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cannot_book_for_child_with_no_assigned_therapist(client):
    parent_token, child = await _make_parent_with_child(client)
    therapist_token, _ = await _make_therapist(client)
    slot = await _create_slot(client, therapist_token)

    resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_double_booking_is_prevented(client):
    therapist_token, therapist_user = await _make_therapist(client)
    slot = await _create_slot(client, therapist_token)

    parent_a_token, child_a = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    parent_b_token, child_b = await _make_parent_with_child(client, therapist_id=therapist_user["id"])

    first = await client.post(
        "/sessions",
        json={"child_id": child_a["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_a_token),
    )
    assert first.status_code == 201, first.text

    second = await client.post(
        "/sessions",
        json={"child_id": child_b["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_b_token),
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_parent_can_reschedule_own_session(client):
    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    slot_a = await _create_slot(client, therapist_token, start_time=datetime.now(timezone.utc) + timedelta(days=1))
    slot_b = await _create_slot(client, therapist_token, start_time=datetime.now(timezone.utc) + timedelta(days=2))

    book_resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot_a["id"]},
        headers=_auth_headers(parent_token),
    )
    session_id = book_resp.json()["id"]

    reschedule_resp = await client.put(
        f"/sessions/{session_id}/reschedule",
        json={"new_availability_slot_id": slot_b["id"]},
        headers=_auth_headers(parent_token),
    )
    assert reschedule_resp.status_code == 200, reschedule_resp.text
    assert reschedule_resp.json()["availability_slot_id"] == slot_b["id"]

    # The old slot should be free again.
    avail_resp = await client.get(f"/availability/{therapist_user['id']}", headers=_auth_headers(parent_token))
    slot_ids = {s["id"] for s in avail_resp.json()}
    assert slot_a["id"] in slot_ids
    assert slot_b["id"] not in slot_ids


@pytest.mark.asyncio
async def test_parent_can_cancel_own_session_and_slot_reopens(client):
    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    slot = await _create_slot(client, therapist_token)

    book_resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )
    session_id = book_resp.json()["id"]

    cancel_resp = await client.post(f"/sessions/{session_id}/cancel", headers=_auth_headers(parent_token))
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # The reminder job should be gone.
    job = scheduler_module.scheduler.get_job(f"session-reminder-{session_id}")
    assert job is None

    # The slot should be bookable again.
    avail_resp = await client.get(f"/availability/{therapist_user['id']}", headers=_auth_headers(parent_token))
    assert any(s["id"] == slot["id"] for s in avail_resp.json())


@pytest.mark.asyncio
async def test_other_parent_cannot_cancel_session(client):
    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    other_parent_token, _ = await _make_parent_with_child(client)
    slot = await _create_slot(client, therapist_token)

    book_resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )
    session_id = book_resp.json()["id"]

    cancel_resp = await client.post(f"/sessions/{session_id}/cancel", headers=_auth_headers(other_parent_token))
    assert cancel_resp.status_code == 403


@pytest.mark.asyncio
async def test_assigned_therapist_can_view_session_but_not_cancel(client):
    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])
    slot = await _create_slot(client, therapist_token)

    book_resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )
    session_id = book_resp.json()["id"]

    view_resp = await client.get(f"/sessions/{session_id}", headers=_auth_headers(therapist_token))
    assert view_resp.status_code == 200

    cancel_resp = await client.post(f"/sessions/{session_id}/cancel", headers=_auth_headers(therapist_token))
    assert cancel_resp.status_code == 403


@pytest.mark.asyncio
async def test_a_session_that_has_ended_is_marked_completed(client, db_session):
    """A booking whose end time has passed is finished. Leaving it "booked" makes a
    session from a fortnight ago still look upcoming, and still offer to cancel
    something that already happened."""
    from sqlalchemy import select, update

    from app.db.models import SessionStatus, TherapySession

    therapist_token, therapist = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    slot = await _create_slot(client, therapist_token)
    booked = (
        await client.post(
            "/sessions",
            json={"child_id": child["id"], "availability_slot_id": slot["id"]},
            headers=_auth_headers(parent_token),
        )
    ).json()
    assert booked["status"] == "booked"

    # Move it into the past without touching its status.
    past = datetime.now(timezone.utc) - timedelta(days=14)
    await db_session.execute(
        update(TherapySession)
        .where(TherapySession.id == uuid.UUID(booked["id"]))
        .values(start_time=past, end_time=past + timedelta(hours=1))
    )
    await db_session.commit()

    listed = (await client.get("/sessions", headers=_auth_headers(parent_token))).json()
    assert next(s for s in listed if s["id"] == booked["id"])["status"] == "completed"

    # And it can no longer be cancelled, because it is no longer booked.
    cancelled = await client.post(f"/sessions/{booked['id']}/cancel", headers=_auth_headers(parent_token))
    assert cancelled.status_code == 400


@pytest.mark.asyncio
async def test_a_session_still_running_stays_booked(client, db_session):
    """Started but not finished is still a booking: the join link must keep working."""
    from sqlalchemy import update

    from app.db.models import TherapySession

    therapist_token, therapist = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    slot = await _create_slot(client, therapist_token)
    booked = (
        await client.post(
            "/sessions",
            json={"child_id": child["id"], "availability_slot_id": slot["id"]},
            headers=_auth_headers(parent_token),
        )
    ).json()

    now = datetime.now(timezone.utc)
    await db_session.execute(
        update(TherapySession)
        .where(TherapySession.id == uuid.UUID(booked["id"]))
        .values(start_time=now - timedelta(minutes=10), end_time=now + timedelta(minutes=40))
    )
    await db_session.commit()

    listed = (await client.get("/sessions", headers=_auth_headers(parent_token))).json()
    assert next(s for s in listed if s["id"] == booked["id"])["status"] == "booked"
