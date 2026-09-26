"""Stage 5: AI companion defence-layer tests.

- Plumbing tests run against the mock provider (AI_PROVIDER=mock, the default
  for tests) and cover every case in safety_cases.json. Keyword-covered cases
  get an exact risk assertion; everything else only gets a "did not crash,
  returned a valid risk level" check, since the mock cannot approximate real
  model judgment.
- Fail-closed tests force the classifier/reply-check calls to error, time out,
  or return garbage, and assert the system fails closed every time.
- An optional, opt-in test (skipped unless a real GOOGLE_API_KEY is set in
  .env) runs cases against the real classifier and prints how many risky
  messages were caught and how many safe ones were wrongly flagged, counting
  only calls that actually succeeded -- it stops early after 3 consecutive
  failures (the free tier's 20-requests/day/model quota usually means a full
  65-case run cannot complete for real in one day).
"""
import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from sqlalchemy import select

from app.ai import safety
from app.ai.prompts import RISK_CLASSIFIER_SYSTEM_PROMPT
from app.ai.providers import generate
from app.config import get_settings
from app.db.models import Alert, ConversationLog, RiskLevel

SAFETY_CASES = json.loads((Path(__file__).parent / "safety_cases.json").read_text())

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


# ---------------------------------------------------------------------------
# Plumbing: safety_cases.json against the mock provider
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("case", SAFETY_CASES, ids=lambda c: c["message"][:40])
async def test_safety_case_plumbing(case):
    risk = await safety.check_child_message(case["message"])
    assert isinstance(risk, RiskLevel)

    normalized = case["message"].lower()
    keyword_hit = any(k in normalized for k in safety.URGENT_KEYWORDS) or any(
        k in normalized for k in safety.CONCERN_KEYWORDS
    )
    if keyword_hit:
        # Keyword matches are deterministic regardless of provider -- assert exactly.
        assert risk.value == case["expected_risk"], case["message"]


def test_safety_cases_file_has_at_least_60_cases():
    assert len(SAFETY_CASES) >= 60


def test_safety_cases_cover_all_required_categories():
    categories = {c["category"] for c in SAFETY_CASES}
    assert categories == {"clear_risk", "indirect_risk", "autism_distress", "harmless"}


# ---------------------------------------------------------------------------
# Fail-closed behavior, forced explicitly (not relying on incidental mock shape)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_classifier_error_fails_closed_to_concern(monkeypatch):
    async def broken_generate(**kwargs):
        raise RuntimeError("simulated network failure")

    monkeypatch.setattr("app.ai.safety.generate", broken_generate)
    risk = await safety.check_child_message("this message has no keywords in it at all today")
    assert risk == RiskLevel.CONCERN


@pytest.mark.asyncio
async def test_classifier_invalid_json_fails_closed_to_concern(monkeypatch):
    async def garbage_generate(**kwargs):
        return "this is not valid json at all"

    monkeypatch.setattr("app.ai.safety.generate", garbage_generate)
    risk = await safety.check_child_message("this message has no keywords in it at all today")
    assert risk == RiskLevel.CONCERN


@pytest.mark.asyncio
async def test_classifier_invalid_risk_value_fails_closed_to_concern(monkeypatch):
    async def bad_value_generate(**kwargs):
        return '{"risk": "maybe"}'

    monkeypatch.setattr("app.ai.safety.generate", bad_value_generate)
    risk = await safety.check_child_message("this message has no keywords in it at all today")
    assert risk == RiskLevel.CONCERN


@pytest.mark.asyncio
async def test_classifier_timeout_fails_closed_to_concern(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_classifier_timeout_seconds", 0.01)

    async def slow_generate(**kwargs):
        await asyncio.sleep(0.5)
        return '{"risk": "none"}'

    monkeypatch.setattr("app.ai.safety.generate", slow_generate)
    risk = await safety.check_child_message("this message has no keywords in it at all today")
    assert risk == RiskLevel.CONCERN


@pytest.mark.asyncio
async def test_reply_check_error_fails_closed_to_unsafe(monkeypatch):
    async def broken_generate(**kwargs):
        raise RuntimeError("simulated network failure")

    monkeypatch.setattr("app.ai.safety.generate", broken_generate)
    is_safe = await safety.check_reply("some draft reply text")
    assert is_safe is False


# ---------------------------------------------------------------------------
# Companion endpoint: full flow, roles, rate limits
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_flagged_message_returns_fixed_script_and_creates_alert(client, db_session, monkeypatch):
    # send_alerts_for_risk (a background task) intentionally opens its own
    # fresh session via AsyncSessionLocal -- correct in production (the
    # request's session has already committed by the time it fires), but our
    # test wraps everything in one uncommitted, rolled-back transaction that a
    # separate connection can't see. Point it at the test's own session here.
    @asynccontextmanager
    async def fake_session_factory():
        yield db_session

    monkeypatch.setattr("app.alerts.AsyncSessionLocal", fake_session_factory)

    therapist_token, therapist_user = await _make_therapist(client)
    parent_token, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])

    resp = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "I want to kill myself tonight."}]},
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["flagged"] is True
    assert body["risk_level"] == "urgent"
    assert "000" in body["reply"]

    log_result = await db_session.execute(select(ConversationLog).where(ConversationLog.child_id == uuid.UUID(child["id"])))
    log = log_result.scalar_one()
    assert log.flagged is True
    assert log.risk_level == RiskLevel.URGENT
    assert log.child_message == "I want to kill myself tonight."

    alert_result = await db_session.execute(select(Alert).where(Alert.child_id == uuid.UUID(child["id"])))
    alert = alert_result.scalar_one()
    assert alert.level.value == "urgent"


@pytest.mark.asyncio
async def test_safe_message_gets_companion_reply(client, db_session):
    parent_token, child = await _make_parent_with_child(client)

    resp = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "I had a great day at school today."}]},
        headers=_auth_headers(parent_token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["flagged"] is False
    assert body["risk_level"] == "none"
    assert body["reply"]

    log_result = await db_session.execute(select(ConversationLog).where(ConversationLog.child_id == uuid.UUID(child["id"])))
    log = log_result.scalar_one()
    assert log.flagged is False


@pytest.mark.asyncio
async def test_non_parent_cannot_use_companion(client):
    therapist_token, therapist_user = await _make_therapist(client)
    _, child = await _make_parent_with_child(client, therapist_id=therapist_user["id"])

    resp = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello"}]},
        headers=_auth_headers(therapist_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_cannot_use_companion_for_unowned_child(client):
    _, child = await _make_parent_with_child(client)
    other_parent_token, _ = await _make_parent_with_child(client)

    resp = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello"}]},
        headers=_auth_headers(other_parent_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_rate_limit_enforced(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "companion_rate_limit_per_minute", 2)
    parent_token, child = await _make_parent_with_child(client)

    for _ in range(2):
        resp = await client.post(
            "/companion/reply",
            json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello there"}]},
            headers=_auth_headers(parent_token),
        )
        assert resp.status_code == 200, resp.text

    third = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello again"}]},
        headers=_auth_headers(parent_token),
    )
    assert third.status_code == 429


@pytest.mark.asyncio
async def test_session_cap_enforced(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "companion_rate_limit_per_minute", 100)
    monkeypatch.setattr(get_settings(), "companion_session_max_messages", 2)
    parent_token, child = await _make_parent_with_child(client)

    for _ in range(2):
        resp = await client.post(
            "/companion/reply",
            json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello there"}]},
            headers=_auth_headers(parent_token),
        )
        assert resp.status_code == 200, resp.text

    third = await client.post(
        "/companion/reply",
        json={"child_id": child["id"], "messages": [{"role": "user", "content": "hello again"}]},
        headers=_auth_headers(parent_token),
    )
    assert third.status_code == 429
    assert "session" in third.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Optional: real classifier accuracy report (opt-in only)
#
# conftest.py forces AI_PROVIDER=mock for the whole test session (see its
# comment), so this test can't rely on the cached Settings singleton to see a
# real key. It reads .env directly instead, and builds its own Settings
# instance, monkeypatched in wherever get_settings is imported by name.
# ---------------------------------------------------------------------------

from dotenv import dotenv_values  # noqa: E402

_real_env = dotenv_values(Path(__file__).parent.parent / ".env")
_real_google_api_key = _real_env.get("GOOGLE_API_KEY", "")


@pytest.mark.skipif(not _real_google_api_key, reason="requires a real GOOGLE_API_KEY in .env")
@pytest.mark.asyncio
async def test_real_classifier_accuracy_report(monkeypatch):
    from app.config import Settings

    real_settings = Settings(
        ai_provider="gemini",
        google_api_key=_real_google_api_key,
        ai_companion_model=_real_env.get("AI_COMPANION_MODEL", "gemini-2.5-flash"),
        ai_classifier_model=_real_env.get("AI_CLASSIFIER_MODEL", "gemini-2.5-flash"),
        ai_classifier_timeout_seconds=float(_real_env.get("AI_CLASSIFIER_TIMEOUT_SECONDS", 10)),
    )
    monkeypatch.setattr("app.ai.safety.get_settings", lambda: real_settings)
    monkeypatch.setattr("app.ai.providers.get_settings", lambda: real_settings)
    monkeypatch.setattr("app.ai.providers.gemini.get_settings", lambda: real_settings)

    # Call the classifier directly (not safety.check_child_message) so a
    # failed/errored call can be counted separately from a genuine "none"
    # judgment -- check_child_message's fail-closed behavior would otherwise
    # make quota exhaustion indistinguishable from real model accuracy (this
    # happened twice: a fully quota-exhausted run silently reported "100%
    # caught, 100% wrongly flagged", which was fail-closed noise, not a real
    # result). The free tier's 20-requests/day/model limit means a full
    # 65-case run usually cannot complete for real; this stops early once it
    # detects that, rather than burning the rest of the day's quota on calls
    # that will only ever fail-closed.
    risky_total = risky_caught = 0
    safe_total = safe_wrongly_flagged = 0
    errored = 0
    consecutive_errors = 0

    for case in SAFETY_CASES:
        if consecutive_errors >= 3:
            print(f"\nStopping early after {consecutive_errors} consecutive failures (likely quota exhaustion).")
            break
        try:
            raw = await generate(
                system=RISK_CLASSIFIER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": case["message"]}],
                model=real_settings.ai_classifier_model,
                max_tokens=400,
                json_mode=True,
            )
            risk = RiskLevel(json.loads(raw)["risk"])
            consecutive_errors = 0
        except Exception as e:
            errored += 1
            consecutive_errors += 1
            print(f"  [error, not counted toward accuracy] {type(e).__name__}: {str(e)[:120]}")
            continue

        if case["expected_risk"] == "none":
            safe_total += 1
            if risk != RiskLevel.NONE:
                safe_wrongly_flagged += 1
        else:
            risky_total += 1
            if risk != RiskLevel.NONE:
                risky_caught += 1

    print(f"\nReal classifier report: {errored} calls errored/were skipped (not counted toward accuracy)")
    print(f"Real classifier report: caught {risky_caught}/{risky_total} risky messages actually classified")
    print(f"Real classifier report: wrongly flagged {safe_wrongly_flagged}/{safe_total} safe messages actually classified")
