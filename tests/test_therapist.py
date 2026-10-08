"""The therapist's own screens: alerts about their clients, and nothing else's."""
import uuid

import pytest

from tests.test_sessions import (
    _auth_headers,
    _create_slot,
    _login,
    _make_parent_with_child,
    _make_therapist,
    _register,
)


async def _flagged(client, child_id, child_token, text="i want to kill myself"):
    """Say something that trips the keyword list, so an alert is raised without the AI."""
    resp = await client.post(
        "/companion/reply",
        json={"child_id": child_id, "messages": [{"role": "user", "content": text}]},
        headers={"Authorization": f"Bearer {child_token}"},
    )
    assert resp.status_code == 200
    return resp.json()


async def _linked(client, parent_token, child_id):
    code = (await client.post(f"/children/{child_id}/link-code", headers=_auth_headers(parent_token))).json()["code"]
    return (await client.post("/auth/child/link", json={"code": code})).json()["access_token"]


@pytest.mark.asyncio
async def test_therapist_sees_alerts_for_their_own_clients(client, db_session, monkeypatch):
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)

    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    child_token = await _linked(client, parent_token, child["id"])
    await _flagged(client, child["id"], child_token)

    rows = (await client.get("/therapist/alerts", headers=_auth_headers(t_token))).json()
    assert len(rows) == 1
    assert rows[0]["child_name"] == child["full_name"]
    assert rows[0]["level"] == "urgent"
    assert rows[0]["noted_at"] is None
    # No message text reaches this screen; it says what happened, not what was said.
    assert "kill" not in str(rows).lower()


@pytest.mark.asyncio
async def test_a_therapist_never_sees_another_therapists_alerts(client, db_session, monkeypatch):
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)

    mine, m_email, m_pw = await _register(client, role="therapist")
    mine_token = await _login(client, m_email, m_pw)
    theirs, _, _ = await _register(client, role="therapist")

    parent_token, child = await _make_parent_with_child(client, therapist_id=theirs["id"])
    child_token = await _linked(client, parent_token, child["id"])
    await _flagged(client, child["id"], child_token)

    assert (await client.get("/therapist/alerts", headers=_auth_headers(mine_token))).json() == []


@pytest.mark.asyncio
async def test_noting_an_alert_clears_only_the_therapists_own_list(client, db_session, monkeypatch):
    """The child's screen must not change: only a parent's "I've seen this" does that."""
    from contextlib import asynccontextmanager

    from sqlalchemy import select

    from app.db.models import Alert

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)

    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    child_token = await _linked(client, parent_token, child["id"])
    await _flagged(client, child["id"], child_token)

    alert_id = (await client.get("/therapist/alerts?needs_attention=true", headers=_auth_headers(t_token))).json()[0]["id"]
    assert (await client.post(f"/therapist/alerts/{alert_id}/note", headers=_auth_headers(t_token))).status_code == 204

    # Gone from their Today list, still there in the full list.
    assert (await client.get("/therapist/alerts?needs_attention=true", headers=_auth_headers(t_token))).json() == []
    assert len((await client.get("/therapist/alerts", headers=_auth_headers(t_token))).json()) == 1

    # The family's acknowledgement is untouched, so the child's screen is unchanged.
    alert = (await db_session.execute(select(Alert).where(Alert.id == uuid.UUID(alert_id)))).scalar_one()
    assert alert.acknowledged_at is None


@pytest.mark.asyncio
async def test_only_a_therapist_can_use_these_routes(client, db_session):
    parent_token, _ = await _make_parent_with_child(client)
    assert (await client.get("/therapist/alerts", headers=_auth_headers(parent_token))).status_code == 403


@pytest.mark.asyncio
async def test_a_therapist_cannot_note_an_alert_for_someone_elses_client(client, db_session, monkeypatch):
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)

    theirs, te, tp = await _register(client, role="therapist")
    theirs_token = await _login(client, te, tp)
    mine, me_, mp = await _register(client, role="therapist")
    mine_token = await _login(client, me_, mp)

    parent_token, child = await _make_parent_with_child(client, therapist_id=theirs["id"])
    child_token = await _linked(client, parent_token, child["id"])
    await _flagged(client, child["id"], child_token)

    alert_id = (await client.get("/therapist/alerts", headers=_auth_headers(theirs_token))).json()[0]["id"]
    resp = await client.post(f"/therapist/alerts/{alert_id}/note", headers=_auth_headers(mine_token))
    assert resp.status_code == 404
