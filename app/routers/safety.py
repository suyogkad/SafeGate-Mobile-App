"""Safety alerts: what the parent sees, and what the child is told.

This is the one place where the two sides of a flagged message meet, and they must
never disagree. The parent sees facts and the actions open to them; the child sees
only what grown-ups have actually done. So:

  * The parent's rows carry the concern level, because their screen shows it. The
    child's state carries no level, no score and no classifier output at all
    (HANDOFF rule 5), and the response shape has no field for one.
  * Neither carries a word the child wrote. An alert says what happened. Reading
    the conversation is the parent's, through their own route.
  * "I've seen this" is the parent's action, recorded in `seen_by_parent_at`. Only
    that lets the child's app say someone who looks after them has seen it -- which
    is the only reason that sentence is allowed on the child's screen. An admin
    clearing the ops alerts inbox sets `acknowledged_at` instead and changes nothing
    the child sees, because an admin is not someone who looks after this child.
  * **SafeGate never contacts emergency services.** A parent asking for them is
    recorded here -- who asked and when -- and nothing is sent anywhere. The record
    exists so the child can be told plainly what is happening, and so there is an
    account of who decided (rule 17).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Alert, AlertLevel, Child, User, UserRole
from app.db.session import get_db
from app.schemas import CalmStateOut, ParentAlertRow
from app.security import ChildPrincipal, get_current_child, require_child_access, require_role

router = APIRouter(tags=["safety"])


async def _names(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    ids = {i for i in ids if i is not None}
    if not ids:
        return {}
    return dict((await db.execute(select(User.id, User.full_name).where(User.id.in_(ids)))).all())


async def _row(db: AsyncSession, alert: Alert, child: Child, names: dict) -> ParentAlertRow:
    therapist_name = names.get(child.therapist_id) if child.therapist_id else None
    # Who else was told, in the words of the rule: the therapist for a concern, the
    # parent and the therapist for an urgent one.
    if therapist_name:
        also = f"{therapist_name}, {child.full_name}'s therapist"
    else:
        also = None
    return ParentAlertRow(
        id=alert.id,
        child_id=alert.child_id,
        child_name=child.full_name,
        level=alert.level.value,
        timestamp=alert.timestamp,
        acknowledged_at=alert.seen_by_parent_at,
        acknowledged_by_name=names.get(alert.seen_by_parent_id),
        emergency_requested_at=alert.emergency_requested_at,
        emergency_requested_by_name=names.get(alert.emergency_requested_by),
        also_told=also,
    )


@router.get("/children/{child_id}/alerts", response_model=list[ParentAlertRow])
async def list_child_alerts(
    response: Response,
    open_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_role(UserRole.PARENT)),
    child: Child = Depends(require_child_access("view_alerts")),
    db: AsyncSession = Depends(get_db),
) -> list[ParentAlertRow]:
    """Safety alerts about this child, newest first.

    `open_only=true` is what the parent's Home shows under "Needs you": alerts
    nobody has said they have seen yet.
    """
    if child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")

    stmt = select(Alert).where(Alert.child_id == child.id)
    if open_only:
        stmt = stmt.where(Alert.seen_by_parent_at.is_(None))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    response.headers["X-Total-Count"] = str(total)

    alerts = (
        await db.execute(stmt.order_by(Alert.timestamp.desc()).limit(limit).offset(offset))
    ).scalars().all()

    names = await _names(
        db,
        {child.therapist_id}
        | {a.seen_by_parent_id for a in alerts}
        | {a.emergency_requested_by for a in alerts},
    )
    return [await _row(db, a, child, names) for a in alerts]


async def _alert_for_parent(db: AsyncSession, alert_id: uuid.UUID, child: Child) -> Alert:
    alert = (await db.execute(select(Alert).where(Alert.id == alert_id))).scalar_one_or_none()
    if alert is None or alert.child_id != child.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.post("/children/{child_id}/alerts/{alert_id}/acknowledge", response_model=ParentAlertRow)
async def acknowledge_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.PARENT)),
    child: Child = Depends(require_child_access("acknowledge_alert")),
    db: AsyncSession = Depends(get_db),
) -> ParentAlertRow:
    """"I've seen this". Only the child's own parent, because this is what lets the
    child's app say someone who looks after them has seen it."""
    if child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")

    alert = await _alert_for_parent(db, alert_id, child)
    # Keep the first one: who saw it first is the fact worth holding.
    if alert.seen_by_parent_at is None:
        now = datetime.now(timezone.utc)
        alert.seen_by_parent_at = now
        alert.seen_by_parent_id = current_user.id
        # The ops inbox counts it as dealt with too, but that marker never drives
        # what the child is told.
        if alert.acknowledged_at is None:
            alert.acknowledged_at = now
            alert.acknowledged_by = current_user.id
        await db.commit()
        await db.refresh(alert)

    names = await _names(db, {child.therapist_id, alert.seen_by_parent_id, alert.emergency_requested_by})
    return await _row(db, alert, child, names)


@router.post("/children/{child_id}/alerts/{alert_id}/emergency-services", response_model=ParentAlertRow)
async def record_emergency_request(
    alert_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.PARENT)),
    child: Child = Depends(require_child_access("emergency_services_requested")),
    db: AsyncSession = Depends(get_db),
) -> ParentAlertRow:
    """Record that this parent asked emergency services to help their child.

    **Nothing is contacted.** SafeGate is not an emergency service and never calls
    one (safety rule 5). This records who asked and when, so the child can be told
    plainly what is happening and there is an account of who decided (rule 17). The
    parent is told, in the app, to call 000 themselves.
    """
    if child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")

    alert = await _alert_for_parent(db, alert_id, child)
    if alert.emergency_requested_at is None:
        now = datetime.now(timezone.utc)
        alert.emergency_requested_at = now
        alert.emergency_requested_by = current_user.id
        # Asking for help is also having seen it, so the child is never told less.
        if alert.seen_by_parent_at is None:
            alert.seen_by_parent_at = now
            alert.seen_by_parent_id = current_user.id
        if alert.acknowledged_at is None:
            alert.acknowledged_at = now
            alert.acknowledged_by = current_user.id
        await db.commit()
        await db.refresh(alert)

    names = await _names(db, {child.therapist_id, alert.seen_by_parent_id, alert.emergency_requested_by})
    return await _row(db, alert, child, names)


@router.get("/companion/calm-state", response_model=CalmStateOut)
async def calm_state(
    principal: ChildPrincipal = Depends(get_current_child),
    db: AsyncSession = Depends(get_db),
) -> CalmStateOut:
    """What the child's own app may know: whether a grown-up who looks after them has
    seen it, and whether one asked emergency services to help.

    Reads `seen_by_parent_at`, never the admin's inbox marker: an admin clearing their
    queue must not make this screen claim a grown-up who looks after the child has
    seen it.

    No level, no score, no classifier output -- the response shape has no field for
    one (HANDOFF rule 5). The child's app decides for itself when to leave calm
    mode; this only tells it which truthful line to show.
    """
    alert = (
        await db.execute(
            select(Alert)
            .where(Alert.child_id == principal.child.id, Alert.level.in_([AlertLevel.CONCERN, AlertLevel.URGENT]))
            .order_by(Alert.timestamp.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if alert is None:
        return CalmStateOut(active=False, seen_by_grown_up=False, emergency_requested=False, started_at=None)

    await principal.log(db, "calm_state_read")
    return CalmStateOut(
        active=True,
        seen_by_grown_up=alert.seen_by_parent_at is not None,
        emergency_requested=alert.emergency_requested_at is not None,
        started_at=alert.timestamp,
    )
