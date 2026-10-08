"""What a therapist's own screens need beyond children and sessions.

A therapist only ever sees alerts about children assigned to them. "Noted" clears
their own list and nothing else: acknowledging an alert on the family's behalf stays
the parent's action, because the child's screen tells them a grown-up who looks after
them has seen it (HANDOFF rule 12, T09).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Alert, Child, User, UserRole
from app.db.session import get_db
from app.schemas import TherapistAlertRow
from app.security import log_child_access, require_role

router = APIRouter(prefix="/therapist", tags=["therapist"])


async def _my_child_ids(db: AsyncSession, therapist: User) -> list[uuid.UUID]:
    rows = await db.execute(
        select(Child.id).where(Child.therapist_id == therapist.id, Child.archived_at.is_(None))
    )
    return list(rows.scalars().all())


@router.get("/alerts", response_model=list[TherapistAlertRow])
async def my_alerts(
    response: Response,
    needs_attention: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> list[TherapistAlertRow]:
    """Safety alerts for this therapist's own clients.

    `needs_attention=true` is what the Today screen shows: alerts this therapist has
    not yet noted.
    """
    child_ids = await _my_child_ids(db, therapist)
    if not child_ids:
        response.headers["X-Total-Count"] = "0"
        return []

    stmt = select(Alert).where(Alert.child_id.in_(child_ids))
    if needs_attention:
        stmt = stmt.where(Alert.therapist_noted_at.is_(None))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    response.headers["X-Total-Count"] = str(total)

    rows = (
        await db.execute(stmt.order_by(Alert.timestamp.desc()).limit(limit).offset(offset))
    ).scalars().all()

    names = dict(
        (await db.execute(select(Child.id, Child.full_name).where(Child.id.in_({r.child_id for r in rows})))).all()
    )
    return [
        TherapistAlertRow(
            id=r.id,
            child_id=r.child_id,
            child_name=names.get(r.child_id),
            level=r.level.value,
            timestamp=r.timestamp,
            # Whether the family has seen it: the therapist's alert screen says so,
            # and it is the difference between "nobody has acted" and "a parent has".
            parent_seen_at=r.acknowledged_at,
            noted_at=r.therapist_noted_at,
        )
        for r in rows
    ]


@router.post("/alerts/{alert_id}/note", status_code=status.HTTP_204_NO_CONTENT)
async def note_alert(
    alert_id: uuid.UUID,
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Clears this alert from the therapist's own list. Nobody else is affected, and
    the child is told nothing: only a parent's "I've seen this" changes what they see."""
    alert = (await db.execute(select(Alert).where(Alert.id == alert_id))).scalar_one_or_none()
    if alert is None or alert.child_id not in await _my_child_ids(db, therapist):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.therapist_noted_at = datetime.now(timezone.utc)
    await db.commit()
    await log_child_access(db, alert.child_id, therapist.id, "alert_noted")
