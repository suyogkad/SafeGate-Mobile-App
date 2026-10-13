"""A child's own records: check-ins, the journal, and their sessions.

The rule these exist for: **every child message goes through the defence layer**
(safety rule 2). Free text a child types into their journal is a child message --
"I want to kill myself" written there is no less serious than typed to the
companion -- so it is classified, and a flagged one alerts the same people.

And the other way round: nothing here tells the child what the safety layer decided
about them (HANDOFF rule 5).
"""
from contextlib import asynccontextmanager

import pytest

from tests.test_child_access import _admin_token
from tests.test_sessions import (
    _auth_headers,
    _create_slot,
    _login,
    _make_parent_with_child,
    _register,
)


@pytest.fixture
def one_db(db_session, monkeypatch):
    """Alerts are written from a background task with its own session."""

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)


def _child(token):
    return {"Authorization": f"Bearer {token}"}


async def _family(client, *, with_therapist=False):
    therapist_id = None
    if with_therapist:
        therapist, t_email, t_pw = await _register(client, role="therapist")
        therapist_id = therapist["id"]
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_id)
    code = (
        await client.post(f"/children/{child['id']}/link-code", headers=_auth_headers(parent_token))
    ).json()["code"]
    child_token = (await client.post("/auth/child/link", json={"code": code})).json()["access_token"]
    return parent_token, child, child_token


@pytest.mark.asyncio
async def test_a_child_checks_in_and_their_parent_reads_it_in_their_words(client, one_db):
    parent_token, child, child_token = await _family(client)

    saved = await client.post(
        "/companion/checkins",
        json={"mood": "notGreat", "words": ["Worried", "Tired"], "topics": ["School"]},
        headers=_child(child_token),
    )
    assert saved.status_code == 201
    # The child is told whether to switch to calm steps, and nothing else.
    assert set(saved.json().keys()) == {"id", "created_at", "calm"}
    assert saved.json()["calm"] is False

    rows = (await client.get(f"/children/{child['id']}/checkins", headers=_auth_headers(parent_token))).json()
    assert len(rows) == 1
    assert rows[0]["mood"] == "notGreat"
    assert rows[0]["words"] == ["Worried", "Tired"]
    assert rows[0]["topics"] == ["School"]
    # Which phone it came from, so a parent can tell.
    assert rows[0]["device_id"]
    # No score anywhere: the child's own words are the record (rule 14).
    assert "score" not in str(rows).lower()


@pytest.mark.asyncio
async def test_a_mood_on_its_own_never_raises_an_alert(client, one_db):
    """The design has the child choose from their own words and the parent read them,
    not a threshold that fires on "Bad"."""
    parent_token, child, child_token = await _family(client, with_therapist=True)
    saved = await client.post(
        "/companion/checkins",
        json={"mood": "bad", "words": ["Scared", "Too much"], "topics": ["Home"]},
        headers=_child(child_token),
    )
    assert saved.json()["calm"] is False
    assert (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json() == []


@pytest.mark.asyncio
async def test_a_journal_entry_goes_through_the_defence_layer(client, one_db):
    """Safety rule 2. A flagged entry alerts the same people a flagged message does,
    and the child's app is told to switch to calm steps."""
    parent_token, child, child_token = await _family(client, with_therapist=True)

    saved = await client.post(
        "/companion/journal",
        json={"prompt": "Something on my mind", "text": "i want to kill myself"},
        headers=_child(child_token),
    )
    assert saved.status_code == 201
    assert saved.json()["calm"] is True
    # Still no level, no score, no classifier output (rule 5).
    assert set(saved.json().keys()) == {"id", "created_at", "calm"}

    alerts = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()
    assert len(alerts) == 1 and alerts[0]["level"] == "urgent"

    # And the child's own app is now in calm mode.
    state = (await client.get("/companion/calm-state", headers=_child(child_token))).json()
    assert state["active"] is True


@pytest.mark.asyncio
async def test_a_safe_journal_entry_raises_nothing(client, one_db):
    parent_token, child, child_token = await _family(client, with_therapist=True)
    saved = await client.post(
        "/companion/journal",
        json={"text": "today i built a lego castle and it did not fall over"},
        headers=_child(child_token),
    )
    assert saved.json()["calm"] is False
    assert (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json() == []


@pytest.mark.asyncio
async def test_a_checkin_note_is_checked_too(client, one_db):
    """The flow does not ask for a note today, but if it ever does, the text is a
    child message like any other."""
    parent_token, child, child_token = await _family(client, with_therapist=True)
    saved = await client.post(
        "/companion/checkins",
        json={"mood": "bad", "words": [], "topics": [], "note": "i want to kill myself"},
        headers=_child(child_token),
    )
    assert saved.json()["calm"] is True
    alerts = (await client.get(f"/children/{child['id']}/alerts", headers=_auth_headers(parent_token))).json()
    assert len(alerts) == 1


@pytest.mark.asyncio
async def test_the_child_can_reread_their_own_journal_without_being_told_a_level(client, one_db):
    _, child, child_token = await _family(client)
    await client.post("/companion/journal", json={"text": "a quiet day"}, headers=_child(child_token))
    await client.post(
        "/companion/journal", json={"text": "i want to kill myself"}, headers=_child(child_token)
    )

    entries = (await client.get("/companion/my-journal", headers=_child(child_token))).json()
    assert len(entries) == 2
    for e in entries:
        assert set(e.keys()) == {"id", "created_at", "prompt", "text", "device_id"}
    for banned in ("risk", "flagged", "urgent", "concern", "score"):
        assert banned not in str(entries).lower()


@pytest.mark.asyncio
async def test_the_parent_reads_the_journal_and_an_admin_never_does(client, db_session, one_db):
    parent_token, child, child_token = await _family(client)
    await client.post(
        "/companion/journal",
        json={"prompt": "A good moment", "text": "we went to the park"},
        headers=_child(child_token),
    )

    rows = (await client.get(f"/children/{child['id']}/journal", headers=_auth_headers(parent_token))).json()
    assert rows[0]["text"] == "we went to the park"
    assert rows[0]["prompt"] == "A good moment"

    a_token = await _admin_token(client, db_session)
    assert (
        await client.get(f"/children/{child['id']}/journal", headers=_auth_headers(a_token))
    ).status_code == 403
    assert (
        await client.get(f"/children/{child['id']}/checkins", headers=_auth_headers(a_token))
    ).status_code == 403


@pytest.mark.asyncio
async def test_another_familys_parent_reaches_neither(client, one_db):
    _, child, child_token = await _family(client)
    await client.post("/companion/journal", json={"text": "mine"}, headers=_child(child_token))
    other_parent_token, _ = await _make_parent_with_child(client)

    assert (
        await client.get(f"/children/{child['id']}/journal", headers=_auth_headers(other_parent_token))
    ).status_code == 404
    assert (
        await client.get(f"/children/{child['id']}/checkins", headers=_auth_headers(other_parent_token))
    ).status_code == 404


@pytest.mark.asyncio
async def test_an_adult_token_cannot_write_a_childs_records(client, one_db):
    """Child tokens and adult tokens are separate worlds. A parent may read these;
    only the child writes them."""
    parent_token, child, _ = await _family(client)
    assert (
        await client.post(
            "/companion/journal", json={"text": "not mine to write"}, headers=_auth_headers(parent_token)
        )
    ).status_code == 401
    assert (
        await client.post(
            "/companion/checkins", json={"mood": "ok"}, headers=_auth_headers(parent_token)
        )
    ).status_code == 401


@pytest.mark.asyncio
async def test_a_child_sees_their_own_sessions_and_not_an_adults_view(client, one_db):
    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    code = (
        await client.post(f"/children/{child['id']}/link-code", headers=_auth_headers(parent_token))
    ).json()["code"]
    child_token = (await client.post("/auth/child/link", json={"code": code})).json()["access_token"]

    slot = await _create_slot(client, t_token)
    await client.post(
        "/sessions",
        json={"child_id": child["id"], "availability_slot_id": slot["id"]},
        headers=_auth_headers(parent_token),
    )

    mine = (await client.get("/companion/my-sessions", headers=_child(child_token))).json()
    assert len(mine) == 1
    assert mine[0]["therapist_name"] == therapist["full_name"]
    assert mine[0]["meeting_kind"] == "video"
    # Whether their therapist has written notes is not the child's business.
    assert "notes_written" not in mine[0] and "notes_shared_at" not in mine[0]
    # And the adult session list stays shut to a child token.
    assert (await client.get("/sessions", headers=_child(child_token))).status_code == 401
