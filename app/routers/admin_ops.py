"""Admin oversight: alerts, safety stats, flagged-conversation review, audit
views, child/session corrections, system health, settings, and CSV export.

Privacy: flagged conversations are exposed as metadata only (who, when, risk
level, review state) -- never the child's message or the reply text.
"""
import csv
import io
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

import app.scheduler as scheduler_module
from app import runtime_settings
from app.ai.scripts import EMERGENCY_NUMBERS, get_emergency_numbers
from app.alerts import NO_RECIPIENTS
from app.audit import log_admin_action
from app.config import get_settings
from app.db.models import (
    AdminAuditLog,
    Alert,
    AlertStatus,
    AvailabilitySlot,
    Child,
    ChildAccessLog,
    ConversationLog,
    RiskLevel,
    SessionStatus,
    TherapySession,
    User,
    UserRole,
)
from app.db.session import get_db
from app.reminders import cancel_session_reminder
from app.routers.children import _enrich, ensure_assignable_therapist
from app.routers.sessions import _enrich_sessions
from app.schemas import (
    AccessLogRow,
    AdminActionRow,
    AdminChildUpdate,
    AlertRow,
    ChildOut,
    DailyFlagCount,
    FlaggedConversationRow,
    SafetyStats,
    SessionOut,
    SettingsUpdate,
)
from app.security import require_role

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.ADMIN))])
admin_only = require_role(UserRole.ADMIN)


async def _user_names(db: AsyncSession, ids: set) -> dict:
    ids = {i for i in ids if i is not None}
    if not ids:
        return {}
    result = await db.execute(select(User.id, User.full_name).where(User.id.in_(ids)))
    return dict(result.all())


async def _child_names(db: AsyncSession, ids: set) -> dict:
    ids = {i for i in ids if i is not None}
    if not ids:
        return {}
    result = await db.execute(select(Child.id, Child.full_name).where(Child.id.in_(ids)))
    return dict(result.all())


async def _count(db: AsyncSession, stmt) -> int:
    return (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()


# ---------------------------------------------------------------- alerts ----


@router.get("/alerts", response_model=list[AlertRow])
async def list_alerts(
    response: Response,
    alert_status: str | None = Query(default=None, alias="status"),
    level: str | None = Query(default=None),
    acknowledged: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[AlertRow]:
    stmt = select(Alert)
    if alert_status:
        stmt = stmt.where(Alert.status == AlertStatus(alert_status))
    if level:
        stmt = stmt.where(Alert.level == level)
    if acknowledged is True:
        stmt = stmt.where(Alert.acknowledged_at.is_not(None))
    if acknowledged is False:
        stmt = stmt.where(Alert.acknowledged_at.is_(None))

    response.headers["X-Total-Count"] = str(await _count(db, stmt))
    rows = (await db.execute(stmt.order_by(Alert.timestamp.desc()).limit(limit).offset(offset))).scalars().all()

    children = await _child_names(db, {a.child_id for a in rows})
    users = await _user_names(db, {a.acknowledged_by for a in rows})
    return [
        AlertRow(
            id=a.id,
            child_id=a.child_id,
            child_name=children.get(a.child_id),
            level=a.level.value,
            recipients=a.recipients,
            status=a.status.value,
            timestamp=a.timestamp,
            no_recipients=a.recipients == NO_RECIPIENTS,
            acknowledged_at=a.acknowledged_at,
            acknowledged_by_name=users.get(a.acknowledged_by),
        )
        for a in rows
    ]


@router.post("/alerts/{alert_id}/acknowledge", status_code=status.HTTP_204_NO_CONTENT)
async def acknowledge_alert(alert_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)) -> None:
    alert = (await db.execute(select(Alert).where(Alert.id == alert_id))).scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = admin.id
    await db.commit()
    await log_admin_action(db, admin.id, "alert.acknowledged", "alert", alert.id)


# ---------------------------------------------------------- safety stats ----


@router.get("/safety/stats", response_model=SafetyStats)
async def safety_stats(days: int = Query(default=30, ge=1, le=365), db: AsyncSession = Depends(get_db)) -> SafetyStats:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    logs = (
        await db.execute(
            select(ConversationLog.timestamp, ConversationLog.risk_level).where(
                ConversationLog.flagged.is_(True), ConversationLog.timestamp >= cutoff
            )
        )
    ).all()
    classifier_failures = await _count(
        db,
        select(ConversationLog).where(ConversationLog.classifier_failed.is_(True), ConversationLog.timestamp >= cutoff),
    )

    daily: dict[str, dict[str, int]] = defaultdict(lambda: {"concern": 0, "urgent": 0, "fallback": 0})
    concern = urgent = fallback = 0
    for ts, risk in logs:
        key = ts.astimezone(timezone.utc).date().isoformat()
        if risk == RiskLevel.URGENT:
            urgent += 1
            daily[key]["urgent"] += 1
        elif risk == RiskLevel.CONCERN:
            concern += 1
            daily[key]["concern"] += 1
        else:  # flagged with risk "none" = the reply check failed and a fallback was used
            fallback += 1
            daily[key]["fallback"] += 1

    alerts_in_window = select(Alert).where(Alert.timestamp >= cutoff)
    unreviewed = select(ConversationLog).where(
        ConversationLog.flagged.is_(True), ConversationLog.reviewed_at.is_(None), ConversationLog.risk_level != RiskLevel.NONE
    )
    return SafetyStats(
        days=days,
        flagged_total=len(logs),
        concern=concern,
        urgent=urgent,
        fallback_replies=fallback,
        classifier_failures=classifier_failures,
        alerts_total=await _count(db, alerts_in_window),
        alerts_failed=await _count(db, alerts_in_window.where(Alert.status == AlertStatus.FAILED)),
        alerts_unacknowledged=await _count(db, select(Alert).where(Alert.acknowledged_at.is_(None))),
        unreviewed_flagged=await _count(db, unreviewed),
        daily=[DailyFlagCount(date=d, **v) for d, v in sorted(daily.items())],
    )


# ------------------------------------------------- flagged conversations ----


@router.get("/conversations/flagged", response_model=list[FlaggedConversationRow])
async def list_flagged_conversations(
    response: Response,
    risk: str | None = Query(default=None),
    reviewed: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[FlaggedConversationRow]:
    stmt = select(ConversationLog).where(ConversationLog.flagged.is_(True))
    if risk:
        stmt = stmt.where(ConversationLog.risk_level == RiskLevel(risk))
    if reviewed is True:
        stmt = stmt.where(ConversationLog.reviewed_at.is_not(None))
    if reviewed is False:
        stmt = stmt.where(ConversationLog.reviewed_at.is_(None))

    response.headers["X-Total-Count"] = str(await _count(db, stmt))
    rows = (
        await db.execute(stmt.order_by(ConversationLog.timestamp.desc()).limit(limit).offset(offset))
    ).scalars().all()
    children = await _child_names(db, {r.child_id for r in rows})
    users = await _user_names(db, {r.reviewed_by for r in rows})
    return [
        FlaggedConversationRow(
            id=r.id,
            child_id=r.child_id,
            child_name=children.get(r.child_id),
            timestamp=r.timestamp,
            risk_level=r.risk_level.value,
            is_fallback=r.risk_level == RiskLevel.NONE,
            classifier_failed=r.classifier_failed,
            reviewed_at=r.reviewed_at,
            reviewed_by_name=users.get(r.reviewed_by),
        )
        for r in rows
    ]


@router.post("/conversations/{log_id}/review", status_code=status.HTTP_204_NO_CONTENT)
async def review_conversation(log_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)) -> None:
    log = (await db.execute(select(ConversationLog).where(ConversationLog.id == log_id))).scalar_one_or_none()
    if log is None or not log.flagged:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flagged conversation not found")
    log.reviewed_at = datetime.now(timezone.utc)
    log.reviewed_by = admin.id
    await db.commit()
    await log_admin_action(db, admin.id, "conversation.reviewed", "conversation", log.id)


# ------------------------------------------------------------ audit logs ----


@router.get("/audit/access", response_model=list[AccessLogRow])
async def access_log(
    response: Response,
    user_id: uuid.UUID | None = None,
    child_id: uuid.UUID | None = None,
    action: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[AccessLogRow]:
    stmt = select(ChildAccessLog)
    if user_id:
        stmt = stmt.where(ChildAccessLog.accessed_by_user_id == user_id)
    if child_id:
        stmt = stmt.where(ChildAccessLog.child_id == child_id)
    if action:
        stmt = stmt.where(ChildAccessLog.action == action)

    response.headers["X-Total-Count"] = str(await _count(db, stmt))
    rows = (await db.execute(stmt.order_by(ChildAccessLog.timestamp.desc()).limit(limit).offset(offset))).scalars().all()
    users_result = await db.execute(
        select(User.id, User.full_name, User.role).where(User.id.in_({r.accessed_by_user_id for r in rows} or {uuid.uuid4()}))
    )
    users = {uid: (name, role.value) for uid, name, role in users_result.all()}
    children = await _child_names(db, {r.child_id for r in rows})
    return [
        AccessLogRow(
            id=r.id,
            timestamp=r.timestamp,
            user_id=r.accessed_by_user_id,
            user_name=users.get(r.accessed_by_user_id, (None, None))[0],
            user_role=users.get(r.accessed_by_user_id, (None, None))[1],
            child_id=r.child_id,
            child_name=children.get(r.child_id),
            action=r.action,
        )
        for r in rows
    ]


@router.get("/audit/actions", response_model=list[AdminActionRow])
async def admin_actions(
    response: Response,
    admin_id: uuid.UUID | None = None,
    target_id: uuid.UUID | None = None,
    action_prefix: str | None = Query(default=None, max_length=50),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[AdminActionRow]:
    stmt = select(AdminAuditLog)
    if admin_id:
        stmt = stmt.where(AdminAuditLog.admin_id == admin_id)
    if target_id:
        stmt = stmt.where(AdminAuditLog.target_id == target_id)
    if action_prefix:
        stmt = stmt.where(AdminAuditLog.action.startswith(action_prefix))

    response.headers["X-Total-Count"] = str(await _count(db, stmt))
    rows = (await db.execute(stmt.order_by(AdminAuditLog.timestamp.desc()).limit(limit).offset(offset))).scalars().all()
    admins = await _user_names(db, {r.admin_id for r in rows})
    return [
        AdminActionRow(
            id=r.id,
            timestamp=r.timestamp,
            admin_id=r.admin_id,
            admin_name=admins.get(r.admin_id),
            action=r.action,
            target_type=r.target_type,
            target_id=r.target_id,
            detail=r.detail,
        )
        for r in rows
    ]


# --------------------------------------------------- corrections & support ----


@router.put("/children/{child_id}", response_model=ChildOut)
async def admin_update_child(
    child_id: uuid.UUID,
    payload: AdminChildUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(admin_only),
) -> ChildOut:
    child = (await db.execute(select(Child).where(Child.id == child_id))).scalar_one_or_none()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")

    changes = payload.model_dump(exclude_unset=True)
    if "therapist_id" in changes:
        await ensure_assignable_therapist(db, changes["therapist_id"])
    for field, value in changes.items():
        setattr(child, field, value)
    await db.commit()
    await db.refresh(child)

    action = "child.therapist_reassigned" if "therapist_id" in changes else "child.updated"
    await log_admin_action(db, admin.id, action, "child", child.id, "fields=" + ",".join(sorted(changes)))
    return (await _enrich(db, [child]))[0]


@router.post("/sessions/{session_id}/cancel", response_model=SessionOut)
async def admin_cancel_session(
    session_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)
) -> SessionOut:
    session_obj = (await db.execute(select(TherapySession).where(TherapySession.id == session_id))).scalar_one_or_none()
    if session_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session_obj.status != SessionStatus.BOOKED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a booked session can be cancelled")

    await _cancel_booked(db, session_obj)
    await db.commit()
    await db.refresh(session_obj)
    cancel_session_reminder(session_obj.id)
    await log_admin_action(db, admin.id, "session.cancelled", "session", session_obj.id)
    return (await _enrich_sessions(db, [session_obj]))[0]


async def _cancel_booked(db: AsyncSession, session_obj: TherapySession) -> None:
    session_obj.status = SessionStatus.CANCELLED
    slot = (
        await db.execute(select(AvailabilitySlot).where(AvailabilitySlot.id == session_obj.availability_slot_id))
    ).scalar_one_or_none()
    if slot is not None:
        slot.is_booked = False


async def _get_child(db: AsyncSession, child_id: uuid.UUID) -> Child:
    child = (await db.execute(select(Child).where(Child.id == child_id))).scalar_one_or_none()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


@router.post("/children/{child_id}/archive", response_model=ChildOut)
async def archive_child(
    child_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)
) -> ChildOut:
    """Soft-archives: the record is kept (nothing is deleted) but hidden from the parent and
    therapist, the companion is disabled, and upcoming booked sessions are cancelled."""
    child = await _get_child(db, child_id)
    if child.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Child is already archived")

    now = datetime.now(timezone.utc)
    booked = (
        await db.execute(
            select(TherapySession).where(
                TherapySession.child_id == child.id,
                TherapySession.status == SessionStatus.BOOKED,
                TherapySession.end_time >= now,
            )
        )
    ).scalars().all()
    for session_obj in booked:
        await _cancel_booked(db, session_obj)
    child.archived_at = now
    await db.commit()
    for session_obj in booked:
        cancel_session_reminder(session_obj.id)
    await log_admin_action(db, admin.id, "child.archived", "child", child.id, f"cancelled_sessions={len(booked)}")
    await db.refresh(child)
    return (await _enrich(db, [child]))[0]


@router.post("/children/{child_id}/restore", response_model=ChildOut)
async def restore_child(
    child_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)
) -> ChildOut:
    child = await _get_child(db, child_id)
    if child.archived_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Child is not archived")
    child.archived_at = None
    await db.commit()
    await log_admin_action(db, admin.id, "child.restored", "child", child.id)
    await db.refresh(child)
    return (await _enrich(db, [child]))[0]


# ------------------------------------------------------- system & settings ----


@router.get("/system")
async def system_health(db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    try:
        await db.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        database_ok = False

    scheduler = scheduler_module.scheduler
    day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    return {
        "database_ok": database_ok,
        "scheduler_running": bool(scheduler.running),
        "scheduled_reminder_jobs": len(scheduler.get_jobs()) if scheduler.running else 0,
        "ai_provider": settings.ai_provider,
        "ai_key_configured": bool(settings.google_api_key),
        "ai_is_mock": settings.ai_provider == "mock",
        "video_provider": settings.video_provider,
        "notifications": "mock",
        "alerts_failed_24h": await _count(
            db, select(Alert).where(Alert.status == AlertStatus.FAILED, Alert.timestamp >= day_ago)
        ),
        "pending_therapists": await _count(
            db, select(User).where(User.role == UserRole.THERAPIST, User.therapist_status == "pending")
        ),
        "environment": settings.environment,
    }


async def _settings_view(db: AsyncSession) -> dict:
    values = runtime_settings.current_values()
    return {
        **values,
        "emergency_numbers": get_emergency_numbers(values["safety_country"]),
        "countries": sorted(EMERGENCY_NUMBERS),
        "defaults": runtime_settings.env_defaults(),
        "overridden": await runtime_settings.overridden_keys(db),
        "locked": runtime_settings.locked_by_environment(),
    }


@router.get("/settings")
async def platform_settings(db: AsyncSession = Depends(get_db)) -> dict:
    """Effective runtime settings (never secrets), the environment defaults, and which are overridden."""
    return await _settings_view(db)


@router.patch("/settings")
async def update_platform_settings(
    payload: SettingsUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)
) -> dict:
    changes = {key: getattr(payload, key) for key in payload.model_fields_set}
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No settings provided")
    try:
        await runtime_settings.update_settings(db, admin.id, changes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return await _settings_view(db)


# ------------------------------------------------------------------ export ----


def _safe(value) -> str:
    """Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell)."""
    text_value = "" if value is None else str(value)
    return "'" + text_value if text_value[:1] in ("=", "+", "-", "@") else text_value


def _csv(filename: str, header: list[str], rows: list[list]) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for row in rows:
        writer.writerow([_safe(v) for v in row])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/users.csv")
async def export_users(db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)) -> Response:
    users = (await db.execute(select(User).order_by(User.created_at))).scalars().all()
    await log_admin_action(db, admin.id, "export.users", "export", None, f"rows={len(users)}")
    return _csv(
        "users.csv",
        ["id", "email", "full_name", "role", "phone", "is_active", "therapist_status", "created_at"],
        [[u.id, u.email, u.full_name, u.role.value, u.phone, u.is_active, u.therapist_status, u.created_at.isoformat()] for u in users],
    )


@router.get("/export/sessions.csv")
async def export_sessions(db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)) -> Response:
    sessions = (await db.execute(select(TherapySession).order_by(TherapySession.start_time))).scalars().all()
    enriched = await _enrich_sessions(db, list(sessions))
    await log_admin_action(db, admin.id, "export.sessions", "export", None, f"rows={len(enriched)}")
    return _csv(
        "sessions.csv",
        ["id", "child", "therapist", "start_time", "end_time", "status"],
        [[s.id, s.child_name, s.therapist_name, s.start_time.isoformat(), s.end_time.isoformat(), s.status.value] for s in enriched],
    )


@router.get("/export/access-log.csv")
async def export_access_log(db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)) -> Response:
    rows = (await db.execute(select(ChildAccessLog).order_by(ChildAccessLog.timestamp.desc()).limit(50000))).scalars().all()
    users = await _user_names(db, {r.accessed_by_user_id for r in rows})
    children = await _child_names(db, {r.child_id for r in rows})
    await log_admin_action(db, admin.id, "export.access_log", "export", None, f"rows={len(rows)}")
    return _csv(
        "access-log.csv",
        ["timestamp", "user", "child", "action"],
        [[r.timestamp.isoformat(), users.get(r.accessed_by_user_id), children.get(r.child_id), r.action] for r in rows],
    )
