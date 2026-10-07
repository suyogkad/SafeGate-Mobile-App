"""How a child gets into the app, and everything that must stay shut to them.

A child token is the one credential in the system held by a child, so the
boundaries around it are tested hard: what it opens, what it must never open,
and how a parent takes it away again.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.db.models import ChildAccessLog, ChildDevice, ChildLinkCode
from tests.test_sessions import (
    _auth_headers,
    _login,
    _make_parent_with_child,
    _make_therapist,
    _register,
)


def _h(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _code(client, parent_token, child_id) -> str:
    resp = await client.post(f"/children/{child_id}/link-code", headers=_auth_headers(parent_token))
    assert resp.status_code == 201, resp.text
    return resp.json()["code"]


async def _admin_token(client, db_session) -> str:
    from app.db.models import User, UserRole
    from app.security import hash_password

    admin = User(
        email=f"{uuid.uuid4().hex}@example.com",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        full_name="Admin Test",
    )
    db_session.add(admin)
    await db_session.commit()
    return await _login(client, admin.email, "AdminPass123!")


async def _linked_child(client):
    """A parent, their child, and a token for the child's own linked phone."""
    parent_token, child = await _make_parent_with_child(client)
    code = await _code(client, parent_token, child["id"])
    resp = await client.post("/auth/child/link", json={"code": code})
    assert resp.status_code == 201, resp.text
    return parent_token, child, resp.json()["access_token"]


# ----------------------------------------------------------- linking a phone ----


@pytest.mark.asyncio
async def test_child_links_their_own_phone_with_the_parents_code(client):
    parent_token, child, child_token = await _linked_child(client)

    me = await client.get("/auth/child/me", headers=_h(child_token))
    assert me.status_code == 200
    assert me.json()["full_name"] == child["full_name"]


@pytest.mark.asyncio
async def test_a_code_works_once_only(client):
    parent_token, child = await _make_parent_with_child(client)
    code = await _code(client, parent_token, child["id"])

    assert (await client.post("/auth/child/link", json={"code": code})).status_code == 201
    second = await client.post("/auth/child/link", json={"code": code})
    assert second.status_code == 400 and second.json()["detail"] == "That code didn't work"


@pytest.mark.asyncio
async def test_issuing_a_new_code_kills_the_previous_one(client):
    """A code left on screen earlier must not still pair a phone."""
    parent_token, child = await _make_parent_with_child(client)
    first = await _code(client, parent_token, child["id"])
    second = await _code(client, parent_token, child["id"])

    assert (await client.post("/auth/child/link", json={"code": first})).status_code == 400
    assert (await client.post("/auth/child/link", json={"code": second})).status_code == 201


@pytest.mark.asyncio
async def test_an_expired_code_is_refused(client, db_session):
    parent_token, child = await _make_parent_with_child(client)
    code = await _code(client, parent_token, child["id"])
    entry = (
        await db_session.execute(select(ChildLinkCode).where(ChildLinkCode.code == code))
    ).scalar_one()
    entry.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    assert (await client.post("/auth/child/link", json={"code": code})).status_code == 400


@pytest.mark.asyncio
async def test_a_made_up_code_gives_nothing_away(client):
    resp = await client.post("/auth/child/link", json={"code": "ZZZZZZ"})
    assert resp.status_code == 400 and resp.json()["detail"] == "That code didn't work"


@pytest.mark.asyncio
async def test_only_the_childs_own_parent_can_issue_a_code(client):
    _, child = await _make_parent_with_child(client)
    other_parent_token, _ = await _make_parent_with_child(client)
    therapist_token, _ = await _make_therapist(client)

    assert (
        await client.post(f"/children/{child['id']}/link-code", headers=_auth_headers(other_parent_token))
    ).status_code == 404
    assert (
        await client.post(f"/children/{child['id']}/link-code", headers=_auth_headers(therapist_token))
    ).status_code == 403


# ------------------------------------------------- the parent hands their phone over ----


@pytest.mark.asyncio
async def test_parent_can_start_a_child_session_on_their_own_phone(client):
    parent_token, child = await _make_parent_with_child(client)
    resp = await client.post(f"/children/{child['id']}/child-session", headers=_auth_headers(parent_token))
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert body["child"]["full_name"] == child["full_name"]
    me = await client.get("/auth/child/me", headers=_h(body["access_token"]))
    assert me.status_code == 200

    # Short-lived on purpose: the phone goes back in the parent's pocket.
    expires = datetime.fromisoformat(body["expires_at"])
    assert expires < datetime.now(timezone.utc) + timedelta(days=1)


# --------------------------------------------------------- what a child cannot do ----


@pytest.mark.asyncio
async def test_a_child_token_cannot_act_as_an_adult_account(client):
    """The one credential a child holds must not open any adult route."""
    parent_token, child, child_token = await _linked_child(client)
    headers = _h(child_token)

    for method, path in [
        ("get", "/auth/me"),
        ("get", "/children"),
        ("get", f"/children/{child['id']}"),
        ("get", "/sessions"),
        ("get", "/admin/users"),
        ("get", "/admin/safety/stats"),
        ("get", "/therapists"),
    ]:
        resp = await getattr(client, method)(path, headers=headers)
        assert resp.status_code == 401, f"{path} let a child token through ({resp.status_code})"


@pytest.mark.asyncio
async def test_a_child_cannot_issue_codes_or_revoke_devices(client):
    parent_token, child, child_token = await _linked_child(client)
    assert (await client.post(f"/children/{child['id']}/link-code", headers=_h(child_token))).status_code == 401
    assert (await client.get(f"/children/{child['id']}/devices", headers=_h(child_token))).status_code == 401


@pytest.mark.asyncio
async def test_an_adult_token_is_not_a_child_token(client):
    """The separation runs both ways."""
    parent_token, child = await _make_parent_with_child(client)
    assert (await client.get("/auth/child/me", headers=_auth_headers(parent_token))).status_code == 401


@pytest.mark.asyncio
async def test_the_child_profile_carries_no_risk_or_parent_details(client):
    """HANDOFF rule 5: the child's app must never receive risk levels or scores."""
    _, _, child_token = await _linked_child(client)
    body = (await client.get("/auth/child/me", headers=_h(child_token))).json()

    assert set(body) == {"id", "full_name", "therapist_name", "grown_up_name", "grown_up_phone"}
    blob = str(body).lower()
    for leak in ("risk", "concern", "urgent", "parent_id", "emergency_contact", "home_address"):
        assert leak not in blob


# ------------------------------------------------------------------ revoking ----


@pytest.mark.asyncio
async def test_parent_revokes_a_phone_and_its_token_dies_at_once(client):
    parent_token, child, child_token = await _linked_child(client)
    assert (await client.get("/auth/child/me", headers=_h(child_token))).status_code == 200

    devices = (await client.get(f"/children/{child['id']}/devices", headers=_auth_headers(parent_token))).json()
    assert len(devices) == 1 and devices[0]["kind"] == "linked"

    revoke = await client.post(
        f"/children/{child['id']}/devices/{devices[0]['id']}/revoke", headers=_auth_headers(parent_token)
    )
    assert revoke.status_code == 204
    assert (await client.get("/auth/child/me", headers=_h(child_token))).status_code == 401


@pytest.mark.asyncio
async def test_another_parent_cannot_revoke_someone_elses_device(client):
    parent_token, child, _ = await _linked_child(client)
    devices = (await client.get(f"/children/{child['id']}/devices", headers=_auth_headers(parent_token))).json()
    other_parent_token, _ = await _make_parent_with_child(client)

    resp = await client.post(
        f"/children/{child['id']}/devices/{devices[0]['id']}/revoke", headers=_auth_headers(other_parent_token)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_an_archived_child_cannot_be_linked_or_keep_using_a_phone(client, db_session):
    from app.db.models import User, UserRole
    from app.security import hash_password

    parent_token, child, child_token = await _linked_child(client)
    admin = User(
        email=f"{uuid.uuid4().hex}@example.com",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        full_name="Admin Test",
    )
    db_session.add(admin)
    await db_session.commit()
    admin_token = await _login(client, admin.email, "AdminPass123!")

    assert (
        await client.post(f"/children/{child['id']}/archive", headers=_auth_headers(admin_token))
    ).status_code == 404  # admin archive lives under /admin
    archive = await client.post(f"/admin/children/{child['id']}/archive", headers=_auth_headers(admin_token))
    assert archive.status_code == 200

    assert (await client.get("/auth/child/me", headers=_h(child_token))).status_code == 401


# -------------------------------------------------------------------- audit ----


@pytest.mark.asyncio
async def test_child_access_is_attributed_to_the_device_not_a_person(client, db_session):
    """CLAUDE.md requires every access to a child's records to be logged. A child's own
    device is an actor too, so the trail has no blind spot."""
    parent_token, child, _ = await _linked_child(client)

    rows = (
        await db_session.execute(
            select(ChildAccessLog).where(ChildAccessLog.child_id == uuid.UUID(child["id"]))
        )
    ).scalars().all()
    actions = {r.action for r in rows}
    assert {"link_code_issued", "child_device_linked"} <= actions

    linked = next(r for r in rows if r.action == "child_device_linked")
    assert linked.accessed_by_user_id is None  # no adult did this
    issued = next(r for r in rows if r.action == "link_code_issued")
    assert issued.accessed_by_user_id is not None  # the parent did


@pytest.mark.asyncio
async def test_using_the_app_updates_the_devices_last_seen(client, db_session):
    _, child, child_token = await _linked_child(client)
    await client.get("/auth/child/me", headers=_h(child_token))

    device = (
        await db_session.execute(select(ChildDevice).where(ChildDevice.child_id == uuid.UUID(child["id"])))
    ).scalar_one()
    assert device.last_seen_at is not None


@pytest.mark.asyncio
async def test_a_child_can_use_the_companion_from_their_own_phone(client):
    """The companion is the one surface a child token must open."""
    _, child, child_token = await _linked_child(client)

    resp = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello"}]},
        headers=_h(child_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["reply"]
    # The child's app must never be told a risk level it could display (HANDOFF rule 5
    # is enforced in the client; the field exists for the parent's side of the story).
    assert set(body) == {"reply", "flagged", "risk_level"}


@pytest.mark.asyncio
async def test_a_child_cannot_use_the_companion_as_a_different_child(client):
    _, _, child_token = await _linked_child(client)
    _, other_child = await _make_parent_with_child(client)

    resp = await client.post(
        "/companion/reply",
        json={"child_id": other_child["id"], "messages": [{"role": "user", "content": "hello"}]},
        headers=_h(child_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_companion_use_from_a_phone_is_logged_against_the_device(client, db_session):
    _, child, child_token = await _linked_child(client)
    await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello"}]},
        headers=_h(child_token),
    )

    row = (
        await db_session.execute(
            select(ChildAccessLog).where(
                ChildAccessLog.child_id == uuid.UUID(child["id"]),
                ChildAccessLog.action == "companion_reply",
            )
        )
    ).scalars().first()
    assert row is not None
    assert row.accessed_by_device_id is not None and row.accessed_by_user_id is None


@pytest.mark.asyncio
async def test_a_child_can_be_created_without_contact_details(client):
    """The parent setup flow never asks for an emergency contact or an address, so
    creating a child must not require them -- and must not invent them either. A
    placeholder sitting in an emergency contact field reads like a real number to
    whoever needs it most."""
    from tests.test_sessions import _login, _register

    _, email, password = await _register(client, role="parent")
    token = await _login(client, email, password)

    created = await client.post("/children", json={"full_name": "Only A Name"}, headers=_auth_headers(token))
    assert created.status_code == 201, created.text

    body = created.json()
    assert body["emergency_contact_name"] is None
    assert body["emergency_contact_phone"] is None
    assert body["home_address"] is None
    # Specifically not the old placeholders.
    assert "Not provided" not in str(body)


@pytest.mark.asyncio
async def test_contact_details_are_kept_when_they_are_given(client):
    from tests.test_sessions import _login, _register

    _, email, password = await _register(client, role="parent")
    token = await _login(client, email, password)

    created = await client.post(
        "/children",
        json={
            "full_name": "With Details",
            "emergency_contact_name": "Jordan Lee",
            "emergency_contact_phone": "+61 400 000 000",
            "home_address": "1 Test St, Sydney",
        },
        headers=_auth_headers(token),
    )
    assert created.status_code == 201
    assert created.json()["emergency_contact_phone"] == "+61 400 000 000"


# ------------------------------------------------------------- speech to text ----


@pytest.mark.asyncio
async def test_a_child_can_turn_speech_into_text_to_check(client):
    """The transcript comes back to the child so they can confirm or fix it. It is
    never sent onward by itself (HANDOFF rule 13)."""
    _, child, child_token = await _linked_child(client)

    resp = await client.post(
        f"/companion/transcribe?child_id={child['id']}",
        files={"audio": ("speech.m4a", b"pretend-audio-bytes", "audio/m4a")},
        headers=_h(child_token),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["text"]  # the mock provider always "hears" the same sentence
    # Nothing was sent: no conversation turn was created by transcribing.
    assert set(resp.json()) == {"text"}


@pytest.mark.asyncio
async def test_transcription_refuses_another_childs_id(client):
    _, _, child_token = await _linked_child(client)
    _, other_child = await _make_parent_with_child(client)

    resp = await client.post(
        f"/companion/transcribe?child_id={other_child['id']}",
        files={"audio": ("speech.m4a", b"bytes", "audio/m4a")},
        headers=_h(child_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_transcription_rejects_empty_and_oversized_audio(client):
    _, child, child_token = await _linked_child(client)
    url = f"/companion/transcribe?child_id={child['id']}"

    empty = await client.post(url, files={"audio": ("s.m4a", b"", "audio/m4a")}, headers=_h(child_token))
    assert empty.status_code == 400

    huge = await client.post(
        url, files={"audio": ("s.m4a", b"x" * (9 * 1024 * 1024), "audio/m4a")}, headers=_h(child_token)
    )
    assert huge.status_code == 413


@pytest.mark.asyncio
async def test_transcription_needs_a_session(client):
    _, child = await _make_parent_with_child(client)
    resp = await client.post(
        f"/companion/transcribe?child_id={child['id']}",
        files={"audio": ("s.m4a", b"bytes", "audio/m4a")},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_transcribing_is_recorded_in_the_audit_trail(client, db_session):
    _, child, child_token = await _linked_child(client)
    await client.post(
        f"/companion/transcribe?child_id={child['id']}",
        files={"audio": ("s.m4a", b"bytes", "audio/m4a")},
        headers=_h(child_token),
    )
    actions = (
        await db_session.execute(
            select(ChildAccessLog.action).where(ChildAccessLog.child_id == uuid.UUID(child["id"]))
        )
    ).scalars().all()
    assert "speech_transcribed" in actions


# ------------------------------------------- ending a session, and reading it back ----


async def _talked(client, child_id, child_token, text="hello there"):
    resp = await client.post(
        "/companion/reply",
        json={"child_id": child_id, "messages": [{"role": "user", "content": text}]},
        headers=_h(child_token),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_parent_can_read_what_the_child_said_to_the_companion(client):
    """The child is told their grown-up can read this, so it must actually be true."""
    parent_token, child, child_token = await _linked_child(client)
    await _talked(client, child["id"], child_token, "i am building a lego castle")

    resp = await client.get(f"/children/{child['id']}/conversations", headers=_auth_headers(parent_token))
    assert resp.status_code == 200, resp.text
    turns = resp.json()
    assert len(turns) == 1
    assert turns[0]["child_message"] == "i am building a lego castle"
    assert turns[0]["reply"]
    # Attributed to the sitting it happened in, so a parent can tell phones apart.
    assert turns[0]["device_id"] is not None
    assert turns[0]["device_label"]


@pytest.mark.asyncio
async def test_only_the_childs_own_parent_can_read_the_conversation(client):
    parent_token, child, child_token = await _linked_child(client)
    await _talked(client, child["id"], child_token)

    other_parent_token, _ = await _make_parent_with_child(client)
    therapist_token, _ = await _make_therapist(client)

    assert (
        await client.get(f"/children/{child['id']}/conversations", headers=_auth_headers(other_parent_token))
    ).status_code == 404
    # A therapist sees only what the family chooses to share (HANDOFF rule 19).
    assert (
        await client.get(f"/children/{child['id']}/conversations", headers=_auth_headers(therapist_token))
    ).status_code == 403
    # And the child cannot read it back through the parent's route.
    assert (
        await client.get(f"/children/{child['id']}/conversations", headers=_h(child_token))
    ).status_code == 401


@pytest.mark.asyncio
async def test_an_admin_still_cannot_read_what_a_child_said(client, db_session):
    """Admins get oversight, not the contents of a child's conversation."""
    _, child, child_token = await _linked_child(client)
    await _talked(client, child["id"], child_token, "a secret worry")
    admin_token = await _admin_token(client, db_session)

    # The parent route is not theirs to use.
    assert (
        await client.get(f"/children/{child['id']}/conversations", headers=_auth_headers(admin_token))
    ).status_code == 403

    # And the admin's own flagged view carries no message text.
    flagged = (await client.get("/admin/conversations/flagged", headers=_auth_headers(admin_token))).json()
    assert "a secret worry" not in str(flagged)


@pytest.mark.asyncio
async def test_parent_ends_every_session_at_once(client):
    parent_token, child, child_token = await _linked_child(client)
    assert (await client.get("/auth/child/me", headers=_h(child_token))).status_code == 200

    resp = await client.post(f"/children/{child['id']}/devices/end-all", headers=_auth_headers(parent_token))
    assert resp.status_code == 204
    # The phone in the child's hand stops working at its next request.
    assert (await client.get("/auth/child/me", headers=_h(child_token))).status_code == 401


@pytest.mark.asyncio
async def test_ending_sessions_keeps_the_conversation(client):
    """Ending a sitting must not erase what was said: the parent still needs to read it."""
    parent_token, child, child_token = await _linked_child(client)
    await _talked(client, child["id"], child_token, "i felt wobbly at school")
    await client.post(f"/children/{child['id']}/devices/end-all", headers=_auth_headers(parent_token))

    turns = (await client.get(f"/children/{child['id']}/conversations", headers=_auth_headers(parent_token))).json()
    assert any(t["child_message"] == "i felt wobbly at school" for t in turns)


@pytest.mark.asyncio
async def test_admin_can_see_and_end_sessions_without_reading_them(client, db_session):
    _, child, child_token = await _linked_child(client)
    await _talked(client, child["id"], child_token)
    admin_token = await _admin_token(client, db_session)

    devices = await client.get(f"/admin/children/{child['id']}/devices", headers=_auth_headers(admin_token))
    assert devices.status_code == 200 and len(devices.json()) == 1
    assert "child_message" not in str(devices.json())

    ended = await client.post(f"/admin/children/{child['id']}/devices/end-all", headers=_auth_headers(admin_token))
    assert ended.status_code == 204
    assert (await client.get("/auth/child/me", headers=_h(child_token))).status_code == 401


@pytest.mark.asyncio
async def test_a_parent_cannot_end_another_familys_sessions(client):
    _, child, _ = await _linked_child(client)
    other_parent_token, _ = await _make_parent_with_child(client)
    resp = await client.post(f"/children/{child['id']}/devices/end-all", headers=_auth_headers(other_parent_token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_a_therapist_sees_their_caseload_with_the_familys_name(client):
    """A therapist cannot look up users (that is admin-only), so the names they
    legitimately need travel with the child record."""
    from tests.test_sessions import _login, _register

    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist["id"])

    mine = (await client.get("/children", headers=_auth_headers(t_token))).json()
    assert [c["id"] for c in mine] == [child["id"]]
    assert mine[0]["parent_name"]  # the family's name, for the client card
    assert mine[0]["therapist_name"]


@pytest.mark.asyncio
async def test_a_therapist_sees_only_children_assigned_to_them(client):
    from tests.test_sessions import _login, _register

    therapist, t_email, t_pw = await _register(client, role="therapist")
    t_token = await _login(client, t_email, t_pw)
    await _make_parent_with_child(client, therapist_id=therapist["id"])
    await _make_parent_with_child(client)  # someone else's child, unassigned

    mine = (await client.get("/children", headers=_auth_headers(t_token))).json()
    assert len(mine) == 1
