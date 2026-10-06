"""Admin-editable runtime settings.

Precedence, highest first: a real environment variable, then a row in `app_settings`, then
the built-in default in config.py. Stored rows are applied to the shared Settings object at
startup and on every edit, so all modules see a change immediately. Secrets never live here.

The environment wins so that an explicit `AI_PROVIDER=mock` (as tests/conftest.py sets) can
never be overridden by a stored `gemini` row -- that would silently send test traffic, and
real child messages in a misconfigured deployment, to the live API.

Changes apply to this server process; with several workers, restart the others.
"""
import logging
import os
import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.scripts import EMERGENCY_NUMBERS
from app.audit import log_admin_action
from app.config import Settings, get_settings
from app.db.models import AppSetting
from app.schemas import SettingsUpdate

logger = logging.getLogger(__name__)

EDITABLE = tuple(SettingsUpdate.model_fields)


def env_defaults() -> dict[str, Any]:
    fresh = Settings()
    return {key: getattr(fresh, key) for key in EDITABLE}


def locked_by_environment() -> list[str]:
    """Keys pinned by a real environment variable, which a stored row must not override."""
    return [key for key in EDITABLE if key.upper() in os.environ or key in os.environ]


def current_values() -> dict[str, Any]:
    settings = get_settings()
    return {key: getattr(settings, key) for key in EDITABLE}


def _check_consistency(values: dict[str, Any]) -> None:
    settings = get_settings()
    if values["safety_country"] not in EMERGENCY_NUMBERS:
        raise ValueError(f"No emergency numbers are configured for country {values['safety_country']}")
    if values["ai_provider"] == "groq" and not settings.groq_api_key:
        raise ValueError("The Groq provider needs GROQ_API_KEY set on the server")
    if values["ai_provider"] == "gemini" and not settings.google_api_key:
        raise ValueError("The Gemini provider needs GOOGLE_API_KEY set on the server")
    if values["ai_provider"] == "mock" and settings.environment == "production":
        raise ValueError("The mock AI provider cannot be used in production")
    if values["video_provider"] == "daily" and not settings.daily_api_key:
        raise ValueError("The Daily video provider needs DAILY_API_KEY set on the server")


def _apply(values: dict[str, Any]) -> None:
    settings = get_settings()
    for key, value in values.items():
        setattr(settings, key, value)


async def overridden_keys(db: AsyncSession) -> list[str]:
    return sorted((await db.execute(select(AppSetting.key))).scalars().all())


async def load_overrides(db: AsyncSession) -> None:
    """Called at startup. Unknown, invalid, or environment-pinned stored values are skipped."""
    rows = (await db.execute(select(AppSetting))).scalars().all()
    locked = set(locked_by_environment())
    valid: dict[str, Any] = {}
    for row in rows:
        if row.key not in EDITABLE:
            continue
        if row.key in locked:
            logger.warning("Stored setting %s ignored: pinned by an environment variable", row.key)
            continue
        try:
            valid[row.key] = getattr(SettingsUpdate.model_validate({row.key: row.value}), row.key)
        except Exception:
            logger.warning("Ignoring invalid stored setting %s", row.key)
    if not valid:
        return
    try:
        _check_consistency({**current_values(), **valid})
    except ValueError as exc:
        logger.warning("Stored settings not applied: %s", exc)
        return
    _apply(valid)


async def update_settings(db: AsyncSession, admin_id: uuid.UUID, changes: dict[str, Any]) -> None:
    """`changes` maps key -> new value, or None to reset that key to its environment default.
    Raises ValueError if the resulting combination is not allowed."""
    locked = sorted(set(changes) & set(locked_by_environment()))
    if locked:
        raise ValueError(
            f"{', '.join(locked)} is fixed by an environment variable on this server and cannot be changed here"
        )

    defaults = env_defaults()
    before = current_values()
    after = dict(before)
    for key, value in changes.items():
        after[key] = defaults[key] if value is None else value
    _check_consistency(after)

    for key, value in changes.items():
        if value is None:
            await db.execute(delete(AppSetting).where(AppSetting.key == key))
            continue
        row = await db.get(AppSetting, key)
        if row is None:
            db.add(AppSetting(key=key, value=value, updated_by=admin_id))
        else:
            row.value = value
            row.updated_by = admin_id
    await db.commit()
    _apply(after)

    detail = ", ".join(f"{key}: {before[key]} -> {after[key]}" for key in sorted(changes))[:500]
    await log_admin_action(db, admin_id, "settings.updated", "settings", None, detail)
