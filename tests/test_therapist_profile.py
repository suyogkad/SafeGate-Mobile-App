"""A therapist's own profile, their working hours, and the goals they set.

The hours are a template; what families actually book are the slots it generates.
These tests pin down the part that matters most: changing your hours must never
move or cancel a session a family has already booked.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from tests.test_sessions import (
    _auth_headers,
    _login,
    _make_parent_with_child,
    _register,
)

SYDNEY = "Australia/Sydney"


def _weekdays_ahead() -> dict:
    """Open every weekday, so the generated slots do not depend on today's date."""
    return {d: [{"start": 540, "end": 720}] for d in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")}


async def _therapist(client):
    user, email, pw = await _register(client, role="therapist")
    return user, await _login(client, email, pw)


@pytest.mark.asyncio
async def test_a_new_therapist_starts_with_an_empty_profile(client):
    """They join by invitation, so nothing filled in is the normal first state."""
    user, token = await _therapist(client)
    me = (await client.get("/therapist/me", headers=_auth_headers(token))).json()
    assert me["full_name"] == user["full_name"]
    assert me["title"] == "" and me["about"] == "" and me["good_for"] == []
    assert me["clinic"] is None
    assert me["hours"]["weekly"] == {}


@pytest.mark.asyncio
async def test_a_therapist_edits_what_families_read(client):
    _, token = await _therapist(client)
    payload = {
        "title": "Psychologist",
        "years_with_kids": 12,
        "blurb": "Psychologist · Autistic kids and teens",
        "tagline": "Calm, practical sessions for kids and their families.",
        "about": "I work with kids aged 5 to 16 in Parramatta and by video.",
        "good_for": [{"emoji": "🧩", "text": "Routines and change"}],
        "clinic_name": "Parramatta",
        "clinic_address": "12 George Street",
    }
    saved = (await client.put("/therapist/me", json=payload, headers=_auth_headers(token))).json()
    assert saved["title"] == "Psychologist"
    assert saved["clinic"] == {"name": "Parramatta", "address": "12 George Street"}
    assert saved["good_for"][0]["text"] == "Routines and change"

    again = (await client.get("/therapist/me", headers=_auth_headers(token))).json()
    assert again["about"] == payload["about"]


@pytest.mark.asyncio
async def test_half_a_clinic_address_is_not_stored(client):
    """A name without a street would send a family to find somewhere that
    isn't there -- the same reason emergency contacts are NULL, not 'Not provided'."""
    _, token = await _therapist(client)
    saved = (
        await client.put(
            "/therapist/me",
            json={"title": "Psychologist", "clinic_name": "Parramatta", "clinic_address": "   "},
            headers=_auth_headers(token),
        )
    ).json()
    assert saved["clinic"] is None


@pytest.mark.asyncio
async def test_setting_hours_creates_the_times_families_can_book(client):
    _, token = await _therapist(client)
    hours = {
        "weekly": _weekdays_ahead(),
        "session_length_min": 50,
        "gap_min": 10,
        "offers_video": True,
        "offers_in_person": False,
        "booking_window_weeks": 1,
        "notice_days": 1,
        "timezone": SYDNEY,
    }
    saved = (await client.put("/therapist/hours", json=hours, headers=_auth_headers(token))).json()
    # 9:00 to 12:00 in 50+10 minute steps = three sessions a day.
    assert saved["open_times"] > 0
    assert saved["open_times"] % 3 == 0
    assert saved["timezone"] == SYDNEY


@pytest.mark.asyncio
async def test_the_generated_times_are_the_therapists_local_morning(client):
    user, token = await _therapist(client)
    await client.put(
        "/therapist/hours",
        json={
            "weekly": _weekdays_ahead(),
            "session_length_min": 50,
            "gap_min": 10,
            "booking_window_weeks": 1,
            "notice_days": 1,
            "timezone": SYDNEY,
        },
        headers=_auth_headers(token),
    )
    slots = (await client.get(f"/availability/{user['id']}", headers=_auth_headers(token))).json()
    assert slots
    starts = {datetime.fromisoformat(s["start_time"]).astimezone(ZoneInfo(SYDNEY)).strftime("%H:%M") for s in slots}
    assert starts == {"09:00", "10:00", "11:00"}


@pytest.mark.asyncio
async def test_changing_hours_never_cancels_a_booked_session(client):
    """The therapist's own hours are theirs to change, but a family's booked time
    is not: it stays until the therapist cancels it, which tells the family."""
    user, token = await _therapist(client)
    await client.put(
        "/therapist/hours",
        json={"weekly": _weekdays_ahead(), "booking_window_weeks": 1, "notice_days": 1, "timezone": SYDNEY},
        headers=_auth_headers(token),
    )
    slots = (await client.get(f"/availability/{user['id']}", headers=_auth_headers(token))).json()
    parent_token, child = await _make_parent_with_child(client, therapist_id=user["id"])
    booked = (
        await client.post(
            "/sessions",
            json={"child_id": child["id"], "availability_slot_id": slots[0]["id"]},
            headers=_auth_headers(parent_token),
        )
    ).json()
    assert booked["status"] == "booked"

    # Now the therapist stops working mornings altogether.
    await client.put(
        "/therapist/hours",
        json={"weekly": {}, "booking_window_weeks": 1, "notice_days": 1, "timezone": SYDNEY},
        headers=_auth_headers(token),
    )
    still_there = (await client.get(f"/sessions/{booked['id']}", headers=_auth_headers(parent_token))).json()
    assert still_there["status"] == "booked"
    assert still_there["start_time"] == booked["start_time"]
    # The open times around it are gone, though.
    left = (await client.get(f"/availability/{user['id']}", headers=_auth_headers(token))).json()
    assert [s for s in left if not s["is_booked"]] == []


@pytest.mark.asyncio
async def test_time_off_removes_open_times_in_those_days(client):
    user, token = await _therapist(client)
    full = (
        await client.put(
            "/therapist/hours",
            json={"weekly": _weekdays_ahead(), "booking_window_weeks": 1, "notice_days": 1, "timezone": SYDNEY},
            headers=_auth_headers(token),
        )
    ).json()

    tomorrow = (datetime.now(ZoneInfo(SYDNEY)) + timedelta(days=1)).date().isoformat()
    off = (
        await client.post(
            "/therapist/time-off",
            json={"from_date": tomorrow, "to_date": tomorrow, "label": "Conference"},
            headers=_auth_headers(token),
        )
    ).json()
    assert off["open_times"] == full["open_times"] - 3
    assert off["time_off"][0]["label"] == "Conference"

    back = (
        await client.delete(f"/therapist/time-off/{off['time_off'][0]['id']}", headers=_auth_headers(token))
    ).json()
    assert back["open_times"] == full["open_times"]
    assert back["time_off"] == []


@pytest.mark.asyncio
async def test_notice_days_keeps_tomorrows_times_out_of_reach(client):
    """Families need warning too: nothing inside the notice window is offered."""
    user, token = await _therapist(client)
    with_notice = (
        await client.put(
            "/therapist/hours",
            json={"weekly": _weekdays_ahead(), "booking_window_weeks": 1, "notice_days": 7, "timezone": SYDNEY},
            headers=_auth_headers(token),
        )
    ).json()
    # A 1-week window with a week's notice leaves only the last day.
    assert with_notice["open_times"] == 3


@pytest.mark.asyncio
async def test_a_parent_reads_a_therapists_public_profile_but_not_their_email(client):
    user, token = await _therapist(client)
    await client.put(
        "/therapist/me",
        json={"title": "Psychologist", "tagline": "Calm, practical sessions.", "about": "Parramatta and video."},
        headers=_auth_headers(token),
    )
    parent_token, _ = await _make_parent_with_child(client)

    listed = (await client.get("/therapists", headers=_auth_headers(parent_token))).json()
    mine = next(t for t in listed if t["id"] == user["id"])
    assert mine["title"] == "Psychologist"
    assert "email" not in mine and "phone" not in mine

    one = (await client.get(f"/therapists/{user['id']}", headers=_auth_headers(parent_token))).json()
    assert one["tagline"] == "Calm, practical sessions."
    assert "email" not in one


@pytest.mark.asyncio
async def test_only_a_therapist_reaches_the_profile_endpoints(client):
    parent_token, _ = await _make_parent_with_child(client)
    assert (await client.get("/therapist/me", headers=_auth_headers(parent_token))).status_code == 403
    assert (
        await client.put("/therapist/hours", json={"weekly": {}}, headers=_auth_headers(parent_token))
    ).status_code == 403


@pytest.mark.asyncio
async def test_hours_refuse_a_range_that_ends_before_it_starts(client):
    _, token = await _therapist(client)
    resp = await client.put(
        "/therapist/hours",
        json={"weekly": {"mon": [{"start": 720, "end": 540}]}},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_goals_are_written_by_the_therapist_and_read_by_the_family(client):
    user, token = await _therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=user["id"])

    empty = (await client.get(f"/children/{child['id']}/goals", headers=_auth_headers(token))).json()
    assert empty["goals"] == []

    goals = ["Mornings before school feel calmer", "Tell someone when things are too loud"]
    saved = (
        await client.put(f"/children/{child['id']}/goals", json={"goals": goals}, headers=_auth_headers(token))
    ).json()
    assert saved["goals"] == goals

    # The parent reads the same words their therapist sees.
    family = (await client.get(f"/children/{child['id']}/goals", headers=_auth_headers(parent_token))).json()
    assert family["goals"] == goals
    # But does not set them.
    assert (
        await client.put(
            f"/children/{child['id']}/goals", json={"goals": ["mine"]}, headers=_auth_headers(parent_token)
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_another_therapist_cannot_read_or_write_a_childs_goals(client):
    user, token = await _therapist(client)
    _, child = await _make_parent_with_child(client, therapist_id=user["id"])
    _, other_token = await _therapist(client)

    assert (
        await client.get(f"/children/{child['id']}/goals", headers=_auth_headers(other_token))
    ).status_code == 403
    assert (
        await client.put(
            f"/children/{child['id']}/goals", json={"goals": ["theirs"]}, headers=_auth_headers(other_token)
        )
    ).status_code == 403
