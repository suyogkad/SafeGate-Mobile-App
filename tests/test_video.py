"""Video room tests: who may join a session's call, when, and what the Daily
provider actually sends.

Joining is the one place the app hands out a credential to a live therapy
session, so the access rules are tested from the endpoint down.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.video import DailyVideoProvider, MockVideoProvider, room_window
from tests.test_sessions import (
    _auth_headers,
    _create_slot,
    _login,
    _make_parent_with_child,
    _make_therapist,
    _register,
)


async def _booked_session(client, start_time=None):
    """A booked session plus the parent and therapist tokens for it."""
    therapist_token, therapist = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    slot = await _create_slot(client, therapist_token, start_time=start_time)
    resp = await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json(), parent_token, therapist_token, child


# ---------------------------------------------------------------- endpoint ----


@pytest.mark.asyncio
async def test_parent_and_therapist_get_distinct_join_links(client):
    # Starting soon so the room is already open.
    start = datetime.now(timezone.utc) + timedelta(minutes=5)
    session, parent_token, therapist_token, _ = await _booked_session(client, start_time=start)

    parent = await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(parent_token))
    assert parent.status_code == 200, parent.text
    assert parent.json()["is_host"] is False
    assert "mock-guest-token" in parent.json()["join_url"]

    therapist = await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(therapist_token))
    assert therapist.status_code == 200
    assert therapist.json()["is_host"] is True  # the therapist runs the call
    assert "mock-host-token" in therapist.json()["join_url"]

    # The link expires with the session, not with the login.
    expires = datetime.fromisoformat(parent.json()["expires_at"])
    assert expires > datetime.fromisoformat(session["end_time"])


@pytest.mark.asyncio
async def test_unrelated_parent_and_therapist_cannot_join(client):
    start = datetime.now(timezone.utc) + timedelta(minutes=5)
    session, _, _, _ = await _booked_session(client, start_time=start)

    other_parent_token, _ = await _make_parent_with_child(client)
    other_therapist_token, _ = await _make_therapist(client)
    for token in (other_parent_token, other_therapist_token):
        resp = await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(token))
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_see_the_session_but_not_join_the_call(client, db_session):
    from app.db.models import User, UserRole
    from app.security import hash_password

    start = datetime.now(timezone.utc) + timedelta(minutes=5)
    session, _, _, _ = await _booked_session(client, start_time=start)

    admin = User(
        email=f"{uuid.uuid4().hex}@example.com",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        full_name="Admin Test",
    )
    db_session.add(admin)
    await db_session.commit()
    admin_token = await _login(client, admin.email, "AdminPass123!")

    assert (await client.get(f"/sessions/{session['id']}", headers=_auth_headers(admin_token))).status_code == 200
    resp = await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(admin_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_join_is_refused_outside_the_session_window(client):
    # Default slot is a day away, well before the room opens.
    session, parent_token, _, _ = await _booked_session(client)
    resp = await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(parent_token))
    assert resp.status_code == 400 and "not open yet" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_cancelled_session_cannot_be_joined(client):
    start = datetime.now(timezone.utc) + timedelta(minutes=5)
    session, parent_token, _, _ = await _booked_session(client, start_time=start)
    assert (await client.post(f"/sessions/{session['id']}/cancel", headers=_auth_headers(parent_token))).status_code == 200

    resp = await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(parent_token))
    assert resp.status_code == 400 and "not booked" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_join_access_is_recorded_against_the_child(client, db_session):
    from sqlalchemy import select

    from app.db.models import ChildAccessLog

    start = datetime.now(timezone.utc) + timedelta(minutes=5)
    session, parent_token, _, child = await _booked_session(client, start_time=start)
    await client.post(f"/sessions/{session['id']}/join", headers=_auth_headers(parent_token))

    actions = (
        await db_session.execute(
            select(ChildAccessLog.action).where(ChildAccessLog.child_id == uuid.UUID(child["id"]))
        )
    ).scalars().all()
    assert "join_video" in actions


# ---------------------------------------------------------------- provider ----


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class _FakeClient:
    """Records Daily API calls instead of making them."""

    def __init__(self, responses: dict) -> None:
        self.responses = responses
        self.calls: list[tuple[str, dict]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, path: str, json: dict):
        self.calls.append((path, json))
        return self.responses[path]


@pytest.mark.asyncio
async def test_daily_creates_a_private_room_that_expires(monkeypatch):
    provider = DailyVideoProvider("test-key")
    fake = _FakeClient({"/rooms": _FakeResponse(200, {"url": "https://safegate.daily.co/session-1"})})
    monkeypatch.setattr(provider, "_client", lambda: fake)

    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    url = await provider.create_room(uuid.uuid4(), expires_at)

    assert url == "https://safegate.daily.co/session-1"
    _, body = fake.calls[0]
    assert body["privacy"] == "private"  # the URL alone must not admit anyone
    assert body["properties"]["exp"] == int(expires_at.timestamp())
    assert body["properties"]["eject_at_room_exp"] is True


@pytest.mark.asyncio
async def test_daily_reuses_and_moves_an_existing_room(monkeypatch):
    """A rescheduled session keeps its room but must move the expiry, or the call
    would cut out partway through the new time slot."""
    provider = DailyVideoProvider("test-key")
    session_id = uuid.uuid4()
    fake = _FakeClient(
        {
            "/rooms": _FakeResponse(400, {"error": "already exists"}),
            f"/rooms/session-{session_id}": _FakeResponse(200, {"url": "https://safegate.daily.co/existing"}),
        }
    )
    monkeypatch.setattr(provider, "_client", lambda: fake)

    expires_at = datetime.now(timezone.utc) + timedelta(hours=3)
    url = await provider.create_room(session_id, expires_at)

    assert url == "https://safegate.daily.co/existing"
    assert fake.calls[1][1]["properties"]["exp"] == int(expires_at.timestamp())


@pytest.mark.asyncio
async def test_daily_token_is_scoped_to_one_participant_and_session(monkeypatch):
    provider = DailyVideoProvider("test-key")
    fake = _FakeClient({"/meeting-tokens": _FakeResponse(200, {"token": "abc123"})})
    monkeypatch.setattr(provider, "_client", lambda: fake)

    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    url = await provider.create_join_url(
        "https://safegate.daily.co/session-9", display_name="Dr Smith", is_host=True, expires_at=expires_at
    )

    assert url == "https://safegate.daily.co/session-9?t=abc123"
    props = fake.calls[0][1]["properties"]
    assert props["room_name"] == "session-9"
    assert props["is_owner"] is True
    assert props["exp"] == int(expires_at.timestamp())
    # No "not before": this server's clock drifting ahead of Daily's would otherwise
    # lock out legitimate participants (the join window is enforced in the endpoint).
    assert "nbf" not in props
    assert props["user_name"] == "Dr Smith"  # the adult's name, never the child's


def test_a_url_from_another_provider_is_not_reused():
    """Switching provider must not leave sessions pointing at dead rooms."""
    daily, mock = DailyVideoProvider("k"), MockVideoProvider()
    assert daily.owns_url("https://safegate.daily.co/session-1") is True
    assert daily.owns_url("https://mock-video.local/room/abc") is False
    assert mock.owns_url("https://safegate.daily.co/session-1") is False


def test_room_window_opens_before_and_outlives_the_session():
    start = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
    opens_at, expires_at = room_window(start, start + timedelta(hours=1))
    assert opens_at < start
    assert expires_at > start + timedelta(hours=1)
