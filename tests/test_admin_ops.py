"""Admin oversight, verification, security actions, audit, and export tests."""
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, select

from app.alerts import send_alerts_for_risk
from app.config import get_settings
from app.db.models import Alert, AlertLevel, AlertStatus, ConversationLog, RiskLevel, User, UserRole
from app.security import hash_password

CHILD = {
    "full_name": "Test Child",
    "emergency_contact_name": "EC",
    "emergency_contact_phone": "+61 400 000 000",
    "home_address": "1 Test St",
}


def _h(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _register(client, role="parent", full_name="Test User", password="TestPass123!"):
    email = f"{uuid.uuid4().hex}@example.com"
    resp = await client.post(
        "/auth/register", json={"email": email, "password": password, "full_name": full_name, "role": role}
    )
    assert resp.status_code == 201, resp.text
    return resp.json(), email, password


async def _login(client, email, password) -> str:
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def _admin(client, db_session):
    admin = User(
        email=f"{uuid.uuid4().hex}@example.com",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        full_name="Admin Test",
    )
    db_session.add(admin)
    await db_session.commit()
    return admin, await _login(client, admin.email, "AdminPass123!")


async def _parent_with_child(client, therapist_id=None):
    _, email, pw = await _register(client, "parent")
    token = await _login(client, email, pw)
    payload = {**CHILD, "therapist_id": therapist_id} if therapist_id else CHILD
    resp = await client.post("/children", json=payload, headers=_h(token))
    assert resp.status_code == 201, resp.text
    return token, resp.json()


@pytest.mark.asyncio
async def test_non_admin_blocked_from_ops_endpoints(client):
    _, email, pw = await _register(client, "parent")
    token = await _login(client, email, pw)
    for path in ["/admin/alerts", "/admin/safety/stats", "/admin/audit/access", "/admin/system", "/admin/settings"]:
        assert (await client.get(path, headers=_h(token))).status_code == 403, path


# ------------------------------------------------ therapist verification ----


@pytest.mark.asyncio
async def test_pending_therapist_hidden_and_unassignable_until_approved(client, db_session, monkeypatch):
    monkeypatch.setattr(get_settings(), "therapist_auto_approve", False)
    _, admin_token = await _admin(client, db_session)
    therapist, _, _ = await _register(client, "therapist", full_name="Pending Therapist Zed")
    assert therapist["therapist_status"] == "pending"

    parent_token, _ = await _parent_with_child(client)
    directory = await client.get("/therapists", headers=_h(parent_token))
    assert therapist["id"] not in {t["id"] for t in directory.json()}

    resp = await client.post("/children", json={**CHILD, "therapist_id": therapist["id"]}, headers=_h(parent_token))
    assert resp.status_code == 400

    approve = await client.post(
        f"/admin/users/{therapist['id']}/verification", json={"status": "approved"}, headers=_h(admin_token)
    )
    assert approve.status_code == 200 and approve.json()["therapist_status"] == "approved"

    directory = await client.get("/therapists", headers=_h(parent_token))
    assert therapist["id"] in {t["id"] for t in directory.json()}
    resp = await client.post("/children", json={**CHILD, "therapist_id": therapist["id"]}, headers=_h(parent_token))
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_verification_only_for_therapists(client, db_session):
    _, admin_token = await _admin(client, db_session)
    parent, _, _ = await _register(client, "parent")
    resp = await client.post(
        f"/admin/users/{parent['id']}/verification", json={"status": "approved"}, headers=_h(admin_token)
    )
    assert resp.status_code == 400


# ------------------------------------------------------ account security ----


@pytest.mark.asyncio
async def test_password_reset_invalidates_old_password_and_tokens(client, db_session):
    _, admin_token = await _admin(client, db_session)
    user, email, pw = await _register(client, "parent")
    old_token = await _login(client, email, pw)

    resp = await client.post(
        f"/admin/users/{user['id']}/reset-password", json={"new_password": "BrandNewPass123!"}, headers=_h(admin_token)
    )
    assert resp.status_code == 204
    assert (await client.get("/auth/me", headers=_h(old_token))).status_code == 401
    assert (await client.post("/auth/login", data={"username": email, "password": pw})).status_code == 401
    assert await _login(client, email, "BrandNewPass123!")


@pytest.mark.asyncio
async def test_force_logout_invalidates_existing_tokens_but_allows_new_login(client, db_session):
    _, admin_token = await _admin(client, db_session)
    user, email, pw = await _register(client, "parent")
    old_token = await _login(client, email, pw)

    assert (await client.post(f"/admin/users/{user['id']}/force-logout", headers=_h(admin_token))).status_code == 204
    assert (await client.get("/auth/me", headers=_h(old_token))).status_code == 401
    new_token = await _login(client, email, pw)
    assert (await client.get("/auth/me", headers=_h(new_token))).status_code == 200


@pytest.mark.asyncio
async def test_admin_cannot_deactivate_self(client, db_session):
    admin, admin_token = await _admin(client, db_session)
    resp = await client.patch(f"/admin/users/{admin.id}", json={"is_active": False}, headers=_h(admin_token))
    assert resp.status_code == 400


# --------------------------------------------------------- audit + lists ----


@pytest.mark.asyncio
async def test_admin_actions_are_audited_without_sensitive_values(client, db_session):
    _, admin_token = await _admin(client, db_session)
    user, _, _ = await _register(client, "parent")
    await client.patch(f"/admin/users/{user['id']}", json={"is_active": False, "phone": "0400 111 222"}, headers=_h(admin_token))
    await client.post(
        f"/admin/users/{user['id']}/reset-password", json={"new_password": "SuperSecret123!"}, headers=_h(admin_token)
    )

    resp = await client.get("/admin/audit/actions", params={"target_id": user["id"]}, headers=_h(admin_token))
    rows = resp.json()
    actions = {r["action"] for r in rows}
    assert {"user.deactivated", "user.updated", "user.password_reset"} <= actions
    blob = str(rows)
    assert "SuperSecret123!" not in blob and "0400 111 222" not in blob


@pytest.mark.asyncio
async def test_access_log_lists_child_record_access(client, db_session):
    _, admin_token = await _admin(client, db_session)
    parent_token, child = await _parent_with_child(client)
    await client.get(f"/children/{child['id']}", headers=_h(parent_token))

    resp = await client.get("/admin/audit/access", params={"child_id": child["id"]}, headers=_h(admin_token))
    assert resp.status_code == 200
    rows = resp.json()
    assert {"create", "view"} <= {r["action"] for r in rows}
    assert rows[0]["child_name"] == "Test Child" and rows[0]["user_name"]
    assert int(resp.headers["X-Total-Count"]) >= 2


@pytest.mark.asyncio
async def test_user_search_and_pagination(client, db_session):
    _, admin_token = await _admin(client, db_session)
    marker = uuid.uuid4().hex[:8]
    for i in range(3):
        await _register(client, "parent", full_name=f"Zzsearch {marker} {i}")

    resp = await client.get("/admin/users", params={"q": marker, "limit": 2}, headers=_h(admin_token))
    assert len(resp.json()) == 2
    assert resp.headers["X-Total-Count"] == "3"
    page2 = await client.get("/admin/users", params={"q": marker, "limit": 2, "offset": 2}, headers=_h(admin_token))
    assert len(page2.json()) == 1


# ------------------------------------------------- alerts + flagged review ----


@pytest.mark.asyncio
async def test_alert_with_no_recipient_is_recorded_not_dropped(client, db_session, monkeypatch):
    _, admin_token = await _admin(client, db_session)
    _, child = await _parent_with_child(client)  # no therapist -> a "concern" has nobody to notify

    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)
    await send_alerts_for_risk(uuid.UUID(child["id"]), RiskLevel.CONCERN)

    rows = (await client.get("/admin/alerts", headers=_h(admin_token))).json()
    mine = [r for r in rows if r["child_id"] == child["id"]]
    assert mine and mine[0]["no_recipients"] is True and mine[0]["status"] == "failed"


@pytest.mark.asyncio
async def test_acknowledge_alert(client, db_session):
    admin, admin_token = await _admin(client, db_session)
    _, child = await _parent_with_child(client)
    alert = Alert(child_id=uuid.UUID(child["id"]), level=AlertLevel.URGENT, recipients="x@example.com", status=AlertStatus.SENT)
    db_session.add(alert)
    await db_session.commit()

    assert (await client.post(f"/admin/alerts/{alert.id}/acknowledge", headers=_h(admin_token))).status_code == 204
    rows = (await client.get("/admin/alerts", params={"acknowledged": True}, headers=_h(admin_token))).json()
    row = next(r for r in rows if r["id"] == str(alert.id))
    assert row["acknowledged_by_name"] == "Admin Test"


@pytest.mark.asyncio
async def test_flagged_conversations_expose_metadata_only_and_can_be_reviewed(client, db_session):
    _, admin_token = await _admin(client, db_session)
    _, child = await _parent_with_child(client)
    log = ConversationLog(
        child_id=uuid.UUID(child["id"]),
        child_message="PRIVATE CHILD WORDS",
        reply="PRIVATE REPLY WORDS",
        flagged=True,
        risk_level=RiskLevel.URGENT,
    )
    db_session.add(log)
    await db_session.commit()

    resp = await client.get("/admin/conversations/flagged", params={"reviewed": False}, headers=_h(admin_token))
    assert "PRIVATE" not in resp.text
    row = next(r for r in resp.json() if r["id"] == str(log.id))
    assert row["risk_level"] == "urgent" and row["reviewed_at"] is None
    assert not {"child_message", "reply"} & set(row)

    assert (await client.post(f"/admin/conversations/{log.id}/review", headers=_h(admin_token))).status_code == 204
    reviewed = (await client.get("/admin/conversations/flagged", params={"reviewed": True}, headers=_h(admin_token))).json()
    assert any(r["id"] == str(log.id) and r["reviewed_by_name"] == "Admin Test" for r in reviewed)


@pytest.mark.asyncio
async def test_safety_stats_counts(client, db_session):
    _, admin_token = await _admin(client, db_session)
    _, child = await _parent_with_child(client)
    cid = uuid.UUID(child["id"])
    baseline = (await client.get("/admin/safety/stats", headers=_h(admin_token))).json()
    for risk in (RiskLevel.URGENT, RiskLevel.CONCERN, RiskLevel.CONCERN, RiskLevel.NONE):
        db_session.add(ConversationLog(child_id=cid, child_message="m", reply="r", flagged=True, risk_level=risk))
    await db_session.commit()

    stats = (await client.get("/admin/safety/stats", headers=_h(admin_token))).json()
    assert stats["urgent"] - baseline["urgent"] == 1
    assert stats["concern"] - baseline["concern"] == 2
    assert stats["fallback_replies"] - baseline["fallback_replies"] == 1
    assert stats["daily"]


# --------------------------------------------- corrections, system, export ----


@pytest.mark.asyncio
async def test_admin_can_reassign_therapist_but_only_to_approved(client, db_session, monkeypatch):
    _, admin_token = await _admin(client, db_session)
    therapist, _, _ = await _register(client, "therapist", full_name="Approved One")
    _, child = await _parent_with_child(client)

    resp = await client.put(f"/admin/children/{child['id']}", json={"therapist_id": therapist["id"]}, headers=_h(admin_token))
    assert resp.status_code == 200 and resp.json()["therapist_name"] == "Approved One"

    monkeypatch.setattr(get_settings(), "therapist_auto_approve", False)
    pending, _, _ = await _register(client, "therapist", full_name="Still Pending")
    bad = await client.put(f"/admin/children/{child['id']}", json={"therapist_id": pending["id"]}, headers=_h(admin_token))
    assert bad.status_code == 400

    actions = (await client.get("/admin/audit/actions", params={"target_id": child["id"]}, headers=_h(admin_token))).json()
    assert "child.therapist_reassigned" in {a["action"] for a in actions}


@pytest.mark.asyncio
async def test_admin_cancels_session_and_frees_slot(client, db_session):
    _, admin_token = await _admin(client, db_session)
    therapist, t_email, t_pw = await _register(client, "therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _parent_with_child(client, therapist_id=therapist["id"])
    start = datetime.now(timezone.utc) + timedelta(days=2)
    slot = (
        await client.post(
            "/availability",
            json={"start_time": start.isoformat(), "end_time": (start + timedelta(hours=1)).isoformat()},
            headers=_h(t_token),
        )
    ).json()
    session = (
        await client.post("/sessions", json={"child_id": child["id"], "availability_slot_id": slot["id"]}, headers=_h(parent_token))
    ).json()

    resp = await client.post(f"/admin/sessions/{session['id']}/cancel", headers=_h(admin_token))
    assert resp.status_code == 200 and resp.json()["status"] == "cancelled"
    open_slots = (await client.get(f"/availability/{therapist['id']}", headers=_h(parent_token))).json()
    assert slot["id"] in {s["id"] for s in open_slots}
    assert (await client.post(f"/admin/sessions/{session['id']}/cancel", headers=_h(admin_token))).status_code == 400


@pytest.mark.asyncio
async def test_system_and_settings_expose_no_secrets(client, db_session):
    _, admin_token = await _admin(client, db_session)
    system = (await client.get("/admin/system", headers=_h(admin_token))).json()
    assert system["database_ok"] is True and system["ai_provider"] == "mock"
    settings = (await client.get("/admin/settings", headers=_h(admin_token))).json()
    assert "emergency_numbers" in settings
    blob = (str(system) + str(settings)).lower()
    assert "api_key" not in blob.replace("ai_key_configured", "") and "jwt" not in blob and "password" not in blob


@pytest.mark.asyncio
async def test_csv_export_neutralises_formula_injection(client, db_session):
    _, admin_token = await _admin(client, db_session)
    await _register(client, "parent", full_name="=HYPERLINK(evil)")
    resp = await client.get("/admin/export/users.csv", headers=_h(admin_token))
    assert resp.status_code == 200 and resp.headers["content-type"].startswith("text/csv")
    assert "'=HYPERLINK(evil)" in resp.text and ",=HYPERLINK" not in resp.text
    assert "hashed_password" not in resp.text


@pytest.mark.asyncio
async def test_admin_archives_child_and_hides_it_from_family(client, db_session):
    _, admin_token = await _admin(client, db_session)
    therapist, t_email, t_pw = await _register(client, "therapist")
    t_token = await _login(client, t_email, t_pw)
    parent_token, child = await _parent_with_child(client, therapist_id=therapist["id"])
    start = datetime.now(timezone.utc) + timedelta(days=2)
    slot = (
        await client.post(
            "/availability",
            json={"start_time": start.isoformat(), "end_time": (start + timedelta(hours=1)).isoformat()},
            headers=_h(t_token),
        )
    ).json()
    session = (
        await client.post("/sessions", json={"child_id": child["id"], "availability_slot_id": slot["id"]}, headers=_h(parent_token))
    ).json()

    resp = await client.post(f"/admin/children/{child['id']}/archive", headers=_h(admin_token))
    assert resp.status_code == 200 and resp.json()["archived_at"] is not None
    assert (await client.post(f"/admin/children/{child['id']}/archive", headers=_h(admin_token))).status_code == 400

    # Hidden from the family; the companion and booking are disabled.
    assert child["id"] not in {c["id"] for c in (await client.get("/children", headers=_h(parent_token))).json()}
    assert child["id"] not in {c["id"] for c in (await client.get("/children", headers=_h(t_token))).json()}
    assert (await client.get(f"/children/{child['id']}", headers=_h(parent_token))).status_code == 404
    reply = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello"}]},
        headers=_h(parent_token),
    )
    assert reply.status_code == 404
    booking = await client.post("/sessions", json={"child_id": child["id"], "availability_slot_id": slot["id"]}, headers=_h(parent_token))
    assert booking.status_code == 404

    # Upcoming session was cancelled and its slot freed; admin still sees the record.
    admin_sessions = {s["id"]: s for s in (await client.get("/sessions", headers=_h(admin_token))).json()}
    assert admin_sessions[session["id"]]["status"] == "cancelled"
    assert child["id"] in {c["id"] for c in (await client.get("/children", headers=_h(admin_token))).json()}
    assert (await client.get(f"/children/{child['id']}", headers=_h(admin_token))).status_code == 200

    # Restoring brings everything back; both actions are audited.
    assert (await client.post(f"/admin/children/{child['id']}/restore", headers=_h(admin_token))).json()["archived_at"] is None
    assert child["id"] in {c["id"] for c in (await client.get("/children", headers=_h(parent_token))).json()}
    assert (await client.post(f"/admin/children/{child['id']}/restore", headers=_h(admin_token))).status_code == 400
    actions = (await client.get(f"/admin/audit/actions?target_id={child['id']}", headers=_h(admin_token))).json()
    assert {"child.archived", "child.restored"} <= {a["action"] for a in actions}


@pytest.mark.asyncio
async def test_archive_is_admin_only(client, db_session):
    parent_token, child = await _parent_with_child(client)
    assert (await client.post(f"/admin/children/{child['id']}/archive", headers=_h(parent_token))).status_code == 403


@pytest.mark.asyncio
async def test_classifier_failure_is_counted_and_still_fails_closed(client, db_session, monkeypatch):
    @asynccontextmanager
    async def fake_session():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session)

    async def broken_generate(**kwargs):
        raise RuntimeError("simulated outage")

    monkeypatch.setattr("app.ai.safety.generate", broken_generate)
    _, admin_token = await _admin(client, db_session)
    parent_token, child = await _parent_with_child(client)

    body = (
        await client.post(
            "/companion/reply",
            json={"child_id": child["id"], "messages": [{"role": "user", "content": "just a normal ordinary message"}]},
            headers=_h(parent_token),
        )
    ).json()
    assert body["flagged"] is True and body["risk_level"] == "concern"  # still fails closed

    stats = (await client.get("/admin/safety/stats", headers=_h(admin_token))).json()
    assert stats["classifier_failures"] == 1
    rows = (await client.get("/admin/conversations/flagged", headers=_h(admin_token))).json()
    assert any(r["classifier_failed"] for r in rows)
    assert all("child_message" not in r and "reply" not in r for r in rows)


@pytest.mark.asyncio
async def test_admin_edits_settings_and_they_take_effect_immediately(client, db_session, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "companion_rate_limit_per_minute", settings.companion_rate_limit_per_minute)
    monkeypatch.setattr(settings, "reminder_lead_minutes", settings.reminder_lead_minutes)
    admin, admin_token = await _admin(client, db_session)

    resp = await client.patch(
        "/admin/settings",
        json={"companion_rate_limit_per_minute": 1, "reminder_lead_minutes": 25},
        headers=_h(admin_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["companion_rate_limit_per_minute"] == 1
    assert {"companion_rate_limit_per_minute", "reminder_lead_minutes"} <= set(body["overridden"])
    assert settings.companion_rate_limit_per_minute == 1  # live, no restart
    assert settings.reminder_lead_minutes == 25

    # The new limit is enforced on the next companion request.
    parent_token, child = await _parent_with_child(client)
    msg = {"child_id": child["id"], "messages": [{"role": "user", "content": "hello there"}]}
    assert (await client.post("/companion/reply", json=msg, headers=_h(parent_token))).status_code == 200
    assert (await client.post("/companion/reply", json=msg, headers=_h(parent_token))).status_code == 429

    # Null resets to the built-in default; the change is audited.
    reset = await client.patch("/admin/settings", json={"companion_rate_limit_per_minute": None}, headers=_h(admin_token))
    assert reset.json()["companion_rate_limit_per_minute"] == body["defaults"]["companion_rate_limit_per_minute"]
    assert "companion_rate_limit_per_minute" not in reset.json()["overridden"]
    actions = (
        await client.get(f"/admin/audit/actions?action_prefix=settings&admin_id={admin.id}", headers=_h(admin_token))
    ).json()
    # Same-transaction rows share a timestamp, so order isn't guaranteed here.
    assert {a["detail"] for a in actions} == {
        "companion_rate_limit_per_minute: 10 -> 1, reminder_lead_minutes: 60 -> 25",
        "companion_rate_limit_per_minute: 1 -> 10",
    }


@pytest.mark.asyncio
async def test_settings_validation_and_secret_guards(client, db_session, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "google_api_key", "")
    monkeypatch.setattr(settings, "daily_api_key", "")
    # conftest pins AI_PROVIDER in the real environment; unpin it so the provider
    # guards below are what's being exercised, not the environment lock.
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    _, admin_token = await _admin(client, db_session)
    patch = lambda body: client.patch("/admin/settings", json=body, headers=_h(admin_token))

    assert (await patch({})).status_code == 400
    assert (await patch({"companion_rate_limit_per_minute": 0})).status_code == 422
    assert (await patch({"ai_provider": "openai"})).status_code == 422
    assert (await patch({"safety_country": "ZZ"})).status_code == 400
    assert (await patch({"ai_provider": "gemini"})).status_code == 400  # no key on the server
    assert (await patch({"video_provider": "daily"})).status_code == 400
    monkeypatch.setattr(settings, "environment", "production")
    assert (await patch({"ai_provider": "mock"})).status_code == 400
    # Secrets cannot be set through this endpoint.
    assert (await patch({"google_api_key": "x"})).status_code == 400  # ignored field -> nothing to change
    assert settings.google_api_key == ""


@pytest.mark.asyncio
async def test_settings_edit_is_admin_only(client, db_session):
    parent_token, _ = await _parent_with_child(client)
    assert (await client.patch("/admin/settings", json={"safety_country": "AU"}, headers=_h(parent_token))).status_code == 403


@pytest.mark.asyncio
async def test_stored_settings_load_at_startup_and_invalid_ones_are_skipped(db_session, monkeypatch):
    from app import runtime_settings
    from app.db.models import AppSetting

    settings = get_settings()
    monkeypatch.setattr(settings, "reminder_lead_minutes", 60)
    monkeypatch.setattr(settings, "companion_session_max_messages", 40)
    # load_overrides applies every stored row to the shared settings object, so start
    # from a clean table: otherwise real rows (e.g. a live video_provider) would leak
    # into later tests. The transaction is rolled back, so the real rows survive.
    await db_session.execute(delete(AppSetting))
    # merge, not add: the dev database may already hold a row for these keys, and this
    # test's transaction is rolled back afterwards either way.
    await db_session.merge(AppSetting(key="reminder_lead_minutes", value=15))
    await db_session.merge(AppSetting(key="companion_session_max_messages", value=-5))  # invalid, ignored
    await db_session.merge(AppSetting(key="google_api_key", value="leak"))  # not editable, ignored
    await db_session.commit()

    await runtime_settings.load_overrides(db_session)
    assert settings.reminder_lead_minutes == 15
    assert settings.companion_session_max_messages == 40
    assert settings.google_api_key != "leak"


@pytest.mark.asyncio
async def test_environment_variable_beats_stored_setting(client, db_session, monkeypatch):
    """A real env var pins a setting: it can't be edited from the console and a stored
    row can't override it. This is what keeps conftest's AI_PROVIDER=mock from ever being
    overridden by a stored "gemini" row and sending test traffic to the real API."""
    from app import runtime_settings
    from app.db.models import AppSetting

    settings = get_settings()
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.setattr(settings, "ai_provider", "mock")
    monkeypatch.setattr(settings, "google_api_key", "a-key")
    _, admin_token = await _admin(client, db_session)

    listed = (await client.get("/admin/settings", headers=_h(admin_token))).json()
    assert "ai_provider" in listed["locked"]

    resp = await client.patch("/admin/settings", json={"ai_provider": "gemini"}, headers=_h(admin_token))
    assert resp.status_code == 400 and "environment" in resp.json()["detail"]
    assert settings.ai_provider == "mock"

    await db_session.execute(delete(AppSetting))  # see the note in the test above
    await db_session.merge(AppSetting(key="ai_provider", value="gemini"))
    await db_session.commit()
    await runtime_settings.load_overrides(db_session)
    assert settings.ai_provider == "mock"  # stored row ignored while pinned
