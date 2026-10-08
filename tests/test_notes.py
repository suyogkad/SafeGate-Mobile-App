"""Session notes: two parts, and the family never sees the therapist's own."""
import pytest

from tests.test_sessions import (
    _auth_headers,
    _create_slot,
    _login,
    _make_parent_with_child,
    _register,
)

DRAFT = {
    "highlights": [{"emoji": "🧩", "text": "Settled quickly with the visual timer"}],
    "shared": "We practised naming feelings. Short sentences worked best.",
    "try_at_home": [{"title": "One step at a time", "line": "Break homework into three parts."}],
    "working": "PRIVATE: review sensory profile before next session.",
}


async def _booked(client):
    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])
    slot = await _create_slot(client, t_token)
    session = (
        await client.post(
            "/sessions",
            json={"child_id": child["id"], "availability_slot_id": slot["id"]},
            headers=_auth_headers(parent_token),
        )
    ).json()
    return t_token, parent_token, child, session


@pytest.mark.asyncio
async def test_therapist_writes_saves_and_shares_notes(client):
    t_token, parent_token, _, session = await _booked(client)

    empty = (await client.get(f"/sessions/{session['id']}/notes", headers=_auth_headers(t_token))).json()
    assert empty["shared"] == "" and empty["shared_at"] is None

    saved = await client.put(f"/sessions/{session['id']}/notes", json=DRAFT, headers=_auth_headers(t_token))
    assert saved.status_code == 200
    assert saved.json()["working"].startswith("PRIVATE")
    # A draft is not shared until the therapist says so.
    assert saved.json()["shared_at"] is None
    assert (
        await client.get(f"/sessions/{session['id']}/shared-notes", headers=_auth_headers(parent_token))
    ).status_code == 404

    shared = await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))
    assert shared.status_code == 200 and shared.json()["shared_at"]


@pytest.mark.asyncio
async def test_the_family_never_receives_the_working_notes(client):
    """HANDOFF rule 21: the parent API must not return the therapist's own notes."""
    t_token, parent_token, _, session = await _booked(client)
    await client.put(f"/sessions/{session['id']}/notes", json=DRAFT, headers=_auth_headers(t_token))
    await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))

    body = (await client.get(f"/sessions/{session['id']}/shared-notes", headers=_auth_headers(parent_token))).json()
    assert "working" not in body
    assert "PRIVATE" not in str(body)
    assert body["shared"] == DRAFT["shared"]
    assert body["highlights"][0]["text"] == DRAFT["highlights"][0]["text"]
    assert body["therapist_name"]


@pytest.mark.asyncio
async def test_only_the_sessions_own_therapist_can_read_or_write(client):
    t_token, parent_token, _, session = await _booked(client)
    other, oe, op = await _register(client, role="therapist")
    other_token = await _login(client, oe, op)

    assert (await client.get(f"/sessions/{session['id']}/notes", headers=_auth_headers(other_token))).status_code == 404
    assert (
        await client.put(f"/sessions/{session['id']}/notes", json=DRAFT, headers=_auth_headers(other_token))
    ).status_code == 404
    # A parent never reaches the therapist's view, even for their own child.
    assert (await client.get(f"/sessions/{session['id']}/notes", headers=_auth_headers(parent_token))).status_code == 403


@pytest.mark.asyncio
async def test_another_familys_parent_cannot_read_shared_notes(client):
    t_token, _, _, session = await _booked(client)
    await client.put(f"/sessions/{session['id']}/notes", json=DRAFT, headers=_auth_headers(t_token))
    await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))

    other_parent_token, _ = await _make_parent_with_child(client)
    resp = await client.get(f"/sessions/{session['id']}/shared-notes", headers=_auth_headers(other_parent_token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_empty_notes_cannot_be_shared(client):
    """Sharing nothing would tell a family there is something to read."""
    t_token, _, _, session = await _booked(client)
    await client.put(
        f"/sessions/{session['id']}/notes",
        json={"highlights": [], "shared": "   ", "try_at_home": [], "working": "only mine"},
        headers=_auth_headers(t_token),
    )
    resp = await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_an_edit_after_sharing_reaches_the_family_when_reshared(client):
    t_token, parent_token, _, session = await _booked(client)
    await client.put(f"/sessions/{session['id']}/notes", json=DRAFT, headers=_auth_headers(t_token))
    await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))

    corrected = {**DRAFT, "shared": "Correction: we practised calm steps, not feelings."}
    await client.put(f"/sessions/{session['id']}/notes", json=corrected, headers=_auth_headers(t_token))
    await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))

    body = (await client.get(f"/sessions/{session['id']}/shared-notes", headers=_auth_headers(parent_token))).json()
    assert body["shared"].startswith("Correction")


@pytest.mark.asyncio
async def test_the_session_list_says_where_the_notes_are(client):
    """The therapist's Sessions list needs to know what still needs writing, and
    the family's needs to know what they can read -- without either seeing the
    other's business."""
    t_token, parent_token, _, session = await _booked(client)

    mine = (await client.get("/sessions", headers=_auth_headers(t_token))).json()[0]
    assert mine["notes_written"] is False and mine["notes_shared_at"] is None

    await client.put(f"/sessions/{session['id']}/notes", json=DRAFT, headers=_auth_headers(t_token))
    mine = (await client.get("/sessions", headers=_auth_headers(t_token))).json()[0]
    assert mine["notes_written"] is True and mine["notes_shared_at"] is None

    # A draft is the therapist's own business: the family is not told one exists.
    theirs = (await client.get("/sessions", headers=_auth_headers(parent_token))).json()[0]
    assert theirs["notes_written"] is None and theirs["notes_shared_at"] is None

    await client.post(f"/sessions/{session['id']}/notes/share", headers=_auth_headers(t_token))
    theirs = (await client.get("/sessions", headers=_auth_headers(parent_token))).json()[0]
    assert theirs["notes_shared_at"]
    assert theirs["notes_written"] is None
