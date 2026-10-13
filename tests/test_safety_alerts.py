"""The two sides of a flagged message: what the parent sees, and what the child is told.

The rule these tests exist for: the child's screen says a grown-up who looks after
them has been told, and once a parent taps "I've seen this", that someone has seen
it. Those sentences are only allowed to be on a child's screen because they are
true, so the state behind them has to be real and shared.
"""
from contextlib import asynccontextmanager

import pytest

from tests.test_child_access import _admin_token
from tests.test_sessions import _auth_headers, _login, _make_parent_with_child, _register


@pytest.fixture
def one_db(db_session, monkeypatch):
    """Alerts are written from a background task with its own session; point it at
    the test's session so the rows are visible inside the test transaction."""

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)


async def _linked_child_token(client, parent_token, child_id):
    code = (
        await client.post(f"/children/{child_id}/link-code", headers=_auth_headers(parent_token))
    ).json()["code"]
    return (await client.post("/auth/child/link", json={"code": code})).json()["access_token"]


async def _say_something_worrying(client, child_id, child_token, text="i want to kill myself"):
    """Trips the keyword list, so an alert is raised without calling the AI."""
    resp = await client.post(
        "/companion/reply",
        json={"child_id": child_id, "messages": [{"role": "user", "content": text}]},
        headers={"Authorization": f"Bearer {child_token}"},
    )
    assert resp.status_code == 200
    return resp.json()


async def _family(client):
    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    child_token = await _linked_child_token(client, parent_token, child["id"])
    return parent_token, child, child_token, t_token


@pytest.mark.asyncio
async def test_a_parent_sees_the_alert_and_the_child_is_told_a_grown_up_knows(client, one_db):
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)

    rows = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()
    assert len(rows) == 1
    alert = rows[0]
    assert alert["level"] == "urgent"
    assert alert["acknowledged_at"] is None
    assert alert["also_told"] and "therapist" in alert["also_told"]
    # An alert says what happened, never what was said.
    assert "kill" not in str(rows).lower()

    # The child's app is told a grown-up has been told, and nothing more.
    state = (
        await client.get("/companion/calm-state", headers={"Authorization": f"Bearer {child_token}"})
    ).json()
    assert state["active"] is True
    assert state["seen_by_grown_up"] is False
    assert state["emergency_requested"] is False


@pytest.mark.asyncio
async def test_the_childs_state_never_carries_a_level_or_a_score(client, one_db):
    """HANDOFF rule 5: the child is told what grown-ups did, never how they were
    assessed. The response shape has no field for a level at all."""
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)

    body = (
        await client.get("/companion/calm-state", headers={"Authorization": f"Bearer {child_token}"})
    ).json()
    assert set(body.keys()) == {"active", "seen_by_grown_up", "emergency_requested", "started_at"}
    for banned in ("urgent", "concern", "risk", "score", "classifier"):
        assert banned not in str(body).lower()


@pytest.mark.asyncio
async def test_i_have_seen_this_travels_back_to_the_child(client, one_db):
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    seen = await client.post(
        f"/children/{child['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(parent_token)
    )
    assert seen.status_code == 200
    assert seen.json()["acknowledged_at"]
    assert seen.json()["acknowledged_by_name"]

    state = (
        await client.get("/companion/calm-state", headers={"Authorization": f"Bearer {child_token}"})
    ).json()
    assert state["seen_by_grown_up"] is True


@pytest.mark.asyncio
async def test_acknowledging_twice_keeps_who_saw_it_first(client, one_db):
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    first = (
        await client.post(
            f"/children/{child['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(parent_token)
        )
    ).json()
    again = (
        await client.post(
            f"/children/{child['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(parent_token)
        )
    ).json()
    assert again["acknowledged_at"] == first["acknowledged_at"]


@pytest.mark.asyncio
async def test_asking_for_emergency_services_records_who_and_contacts_nobody(client, one_db):
    """SafeGate never contacts emergency services (safety rule 5). This records that
    a parent said they asked, so the child can be told plainly (rule 17)."""
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    asked = await client.post(
        f"/children/{child['id']}/alerts/{alert['id']}/emergency-services",
        headers=_auth_headers(parent_token),
    )
    assert asked.status_code == 200
    body = asked.json()
    assert body["emergency_requested_at"]
    assert body["emergency_requested_by_name"]
    # Asking for help is also having seen it, so the child is never told less.
    assert body["acknowledged_at"]

    state = (
        await client.get("/companion/calm-state", headers={"Authorization": f"Bearer {child_token}"})
    ).json()
    assert state["emergency_requested"] is True
    assert state["seen_by_grown_up"] is True


@pytest.mark.asyncio
async def test_open_only_is_what_needs_the_parent(client, one_db):
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    assert len(
        (
            await client.get(
                f"/children/{child['id']}/alerts?open_only=true", headers=_auth_headers(parent_token)
            )
        ).json()
    ) == 1
    await client.post(
        f"/children/{child['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(parent_token)
    )
    assert (
        await client.get(f"/children/{child['id']}/alerts?open_only=true", headers=_auth_headers(parent_token))
    ).json() == []


@pytest.mark.asyncio
async def test_nobody_elses_parent_and_no_therapist_or_admin_reaches_these(client, db_session, one_db):
    """A therapist has their own alert list and their own "Noted". Acknowledging on
    the family's behalf is the parent's, and an admin never does it at all."""
    parent_token, child, child_token, t_token = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    # The child's own therapist can reach the record, but not this route.
    assert (
        await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(t_token))
    ).status_code == 403
    assert (
        await client.post(
            f"/children/{child['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(t_token)
        )
    ).status_code == 403

    a_token = await _admin_token(client, db_session)
    assert (
        await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(a_token))
    ).status_code == 403

    other_parent_token, _ = await _make_parent_with_child(client)
    assert (
        await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(other_parent_token))
    ).status_code == 403


@pytest.mark.asyncio
async def test_a_child_with_nothing_flagged_is_not_in_calm_mode(client, one_db):
    parent_token, child, child_token, _ = await _family(client)
    state = (
        await client.get("/companion/calm-state", headers={"Authorization": f"Bearer {child_token}"})
    ).json()
    assert state == {
        "active": False,
        "seen_by_grown_up": False,
        "emergency_requested": False,
        "started_at": None,
    }


@pytest.mark.asyncio
async def test_an_adult_token_cannot_read_the_childs_calm_state(client, one_db):
    """Child tokens and adult tokens are separate worlds, in both directions."""
    parent_token, _, _, t_token = await _family(client)
    assert (await client.get("/companion/calm-state", headers=_auth_headers(parent_token))).status_code == 401
    assert (await client.get("/companion/calm-state", headers=_auth_headers(t_token))).status_code == 401


@pytest.mark.asyncio
async def test_one_childs_parent_cannot_acknowledge_another_childs_alert(client, one_db):
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    # A second child of the same parent: the alert is not theirs.
    other = (
        await client.post("/children", json={"full_name": "Second Child"}, headers=_auth_headers(parent_token))
    ).json()
    resp = await client.post(
        f"/children/{other['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(parent_token)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_an_admin_clearing_their_inbox_does_not_change_what_the_child_is_told(
    client, db_session, one_db
):
    """The child's screen says "Someone who looks after you has seen this". An admin
    working through the ops alerts inbox is not that person, so their "acknowledge"
    marks their own queue and nothing the child sees."""
    parent_token, child, child_token, _ = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    a_token = await _admin_token(client, db_session)
    cleared = await client.post(f"/admin/alerts/{alert['id']}/acknowledge", headers=_auth_headers(a_token))
    assert cleared.status_code == 204

    state = (
        await client.get("/companion/calm-state", headers={"Authorization": f"Bearer {child_token}"})
    ).json()
    assert state["seen_by_grown_up"] is False

    # And the parent is still shown it as needing them.
    rows = (
        await client.get(f"/children/{child['id']}/alerts?open_only=true", headers=_auth_headers(parent_token))
    ).json()
    assert len(rows) == 1
    assert rows[0]["acknowledged_at"] is None


@pytest.mark.asyncio
async def test_the_therapist_is_only_told_a_parent_has_seen_it_when_one_has(
    client, db_session, one_db
):
    parent_token, child, child_token, t_token = await _family(client)
    await _say_something_worrying(client, child["id"], child_token)
    alert = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()[0]

    a_token = await _admin_token(client, db_session)
    await client.post(f"/admin/alerts/{alert['id']}/acknowledge", headers=_auth_headers(a_token))
    rows = (await client.get("/therapist/alerts", headers=_auth_headers(t_token))).json()
    assert rows[0]["parent_seen_at"] is None

    await client.post(
        f"/children/{child['id']}/alerts/{alert['id']}/acknowledge", headers=_auth_headers(parent_token)
    )
    rows = (await client.get("/therapist/alerts", headers=_auth_headers(t_token))).json()
    assert rows[0]["parent_seen_at"]
