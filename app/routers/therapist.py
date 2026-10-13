"""What a therapist's own screens need beyond children and sessions.

A therapist only ever sees alerts about children assigned to them. "Noted" clears
their own list and nothing else: acknowledging an alert on the family's behalf stays
the parent's action, because the child's screen tells them a grown-up who looks after
them has seen it (HANDOFF rule 12, T09).

The profile and hours endpoints below are about the therapist, not about a child, so
nothing here is health data.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Alert, AvailabilitySlot, Child, TherapistProfile, User, UserRole
from app.db.session import get_db
from app.schemas import (
    ClinicOut,
    GoodForItem,
    NotifyPrefs,
    TherapistAlertRow,
    TherapistMeOut,
    TherapistProfileUpdate,
    TimeOffCreate,
    TimeOffOut,
    TimeRange,
    WorkingHoursOut,
    WorkingHoursUpdate,
)
from app.security import log_child_access, require_role
from app.working_hours import WEEKDAY_KEYS, rebuild_open_slots, zone_of

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
            # Whether the FAMILY has seen it. Deliberately not the admin's inbox
            # marker: "a parent has seen this" has to mean a parent.
            parent_seen_at=r.seen_by_parent_at,
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


# ---- The therapist's own profile and hours -------------------------------


async def _my_profile(db: AsyncSession, therapist: User) -> TherapistProfile:
    """The therapist's profile row, created empty the first time they open it.

    Therapists join by invitation, so a profile with nothing filled in is the normal
    starting state, not an error.
    """
    profile = (
        await db.execute(select(TherapistProfile).where(TherapistProfile.user_id == therapist.id))
    ).scalar_one_or_none()
    if profile is None:
        profile = TherapistProfile(user_id=therapist.id, weekly_hours={}, good_for=[], time_off=[])
        db.add(profile)
        await db.flush()
    return profile


def _clinic(profile: TherapistProfile) -> ClinicOut | None:
    if not (profile.clinic_name and profile.clinic_address):
        return None
    return ClinicOut(name=profile.clinic_name, address=profile.clinic_address)


def _hours_out(profile: TherapistProfile, open_times: int) -> WorkingHoursOut:
    return WorkingHoursOut(
        weekly={
            day: [TimeRange(start=int(r["start"]), end=int(r["end"])) for r in ranges or []]
            for day, ranges in (profile.weekly_hours or {}).items()
        },
        session_length_min=profile.session_length_min,
        gap_min=profile.gap_min,
        offers_video=profile.offers_video,
        offers_in_person=profile.offers_in_person,
        booking_window_weeks=profile.booking_window_weeks,
        notice_days=profile.notice_days,
        timezone=profile.timezone,
        time_off=[
            TimeOffOut(
                id=str(t.get("id") or ""),
                from_date=str(t.get("from_date") or t.get("from") or ""),
                to_date=str(t.get("to_date") or t.get("to") or ""),
                label=str(t.get("label") or ""),
            )
            for t in (profile.time_off or [])
        ],
        open_times=open_times,
    )


async def _open_time_count(db: AsyncSession, therapist_id: uuid.UUID) -> int:
    return (
        await db.execute(
            select(func.count())
            .select_from(AvailabilitySlot)
            .where(
                AvailabilitySlot.therapist_id == therapist_id,
                AvailabilitySlot.is_booked.is_(False),
                AvailabilitySlot.start_time > datetime.now(timezone.utc),
            )
        )
    ).scalar_one()


def _me_out(therapist: User, profile: TherapistProfile, hours: WorkingHoursOut) -> TherapistMeOut:
    return TherapistMeOut(
        id=therapist.id,
        full_name=therapist.full_name,
        email=therapist.email,
        status=therapist.therapist_status,
        title=profile.title,
        years_with_kids=profile.years_with_kids,
        blurb=profile.blurb,
        tagline=profile.tagline,
        about=profile.bio or "",
        good_for=[GoodForItem(**g) for g in (profile.good_for or [])],
        clinic=_clinic(profile),
        notify=NotifyPrefs(
            bookings=profile.notify_bookings,
            sharing=profile.notify_sharing,
            notes_reminders=profile.notify_notes_reminders,
        ),
        hours=hours,
    )


@router.get("/me", response_model=TherapistMeOut)
async def read_me(
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> TherapistMeOut:
    """The signed-in therapist's own profile and working hours."""
    profile = await _my_profile(db, therapist)
    await db.commit()
    await db.refresh(profile)
    hours = _hours_out(profile, await _open_time_count(db, therapist.id))
    return _me_out(therapist, profile, hours)


@router.put("/me", response_model=TherapistMeOut)
async def update_me(
    payload: TherapistProfileUpdate,
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> TherapistMeOut:
    """What families read about this therapist. Their name and email are not editable
    here: those come from the invitation and change through support."""
    profile = await _my_profile(db, therapist)
    profile.title = payload.title.strip()
    profile.years_with_kids = payload.years_with_kids
    profile.blurb = payload.blurb.strip()
    profile.tagline = payload.tagline.strip()
    profile.bio = payload.about.strip() or None
    profile.good_for = [g.model_dump() for g in payload.good_for]
    clinic_name = (payload.clinic_name or "").strip()
    clinic_address = (payload.clinic_address or "").strip()
    # Half an address is worse than none: a family would set off to find it.
    both = bool(clinic_name and clinic_address)
    profile.clinic_name = clinic_name if both else None
    profile.clinic_address = clinic_address if both else None
    await db.commit()
    await db.refresh(profile)
    hours = _hours_out(profile, await _open_time_count(db, therapist.id))
    return _me_out(therapist, profile, hours)


@router.put("/notify", response_model=TherapistMeOut)
async def update_notify(
    payload: NotifyPrefs,
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> TherapistMeOut:
    """What this therapist wants to hear about. Safety alerts are not among these:
    an alert about one of their clients always reaches them."""
    profile = await _my_profile(db, therapist)
    profile.notify_bookings = payload.bookings
    profile.notify_sharing = payload.sharing
    profile.notify_notes_reminders = payload.notes_reminders
    await db.commit()
    await db.refresh(profile)
    hours = _hours_out(profile, await _open_time_count(db, therapist.id))
    return _me_out(therapist, profile, hours)


@router.put("/hours", response_model=WorkingHoursOut)
async def update_hours(
    payload: WorkingHoursUpdate,
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> WorkingHoursOut:
    """Set the weekly hours and rebuild the open times families can book.

    Sessions a family already booked are left exactly where they are.
    """
    for day, ranges in payload.weekly.items():
        if day not in WEEKDAY_KEYS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown day: {day}"
            )
        for r in ranges:
            if r.end <= r.start:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Each range must end after it starts",
                )

    profile = await _my_profile(db, therapist)
    profile.weekly_hours = {
        day: [r.model_dump() for r in ranges] for day, ranges in payload.weekly.items()
    }
    profile.session_length_min = payload.session_length_min
    profile.gap_min = payload.gap_min
    profile.offers_video = payload.offers_video
    profile.offers_in_person = payload.offers_in_person
    profile.booking_window_weeks = payload.booking_window_weeks
    profile.notice_days = payload.notice_days
    profile.timezone = zone_of(payload.timezone).key

    open_times = await rebuild_open_slots(db, profile)
    await db.commit()
    await db.refresh(profile)
    return _hours_out(profile, open_times)


@router.post("/time-off", response_model=WorkingHoursOut, status_code=status.HTTP_201_CREATED)
async def add_time_off(
    payload: TimeOffCreate,
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> WorkingHoursOut:
    """Block out days. Open times inside them disappear; booked sessions do not --
    the therapist still cancels those themselves, so the family is told."""
    if payload.to_date < payload.from_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The last day is before the first",
        )
    profile = await _my_profile(db, therapist)
    entry = {
        "id": uuid.uuid4().hex[:12],
        "from_date": payload.from_date,
        "to_date": payload.to_date,
        "label": payload.label.strip(),
    }
    profile.time_off = [*(profile.time_off or []), entry]
    open_times = await rebuild_open_slots(db, profile)
    await db.commit()
    await db.refresh(profile)
    return _hours_out(profile, open_times)


@router.delete("/time-off/{entry_id}", response_model=WorkingHoursOut)
async def remove_time_off(
    entry_id: str,
    therapist: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> WorkingHoursOut:
    profile = await _my_profile(db, therapist)
    before = list(profile.time_off or [])
    remaining = [t for t in before if str(t.get("id")) != entry_id]
    if len(remaining) == len(before):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off not found")
    profile.time_off = remaining
    open_times = await rebuild_open_slots(db, profile)
    await db.commit()
    await db.refresh(profile)
    return _hours_out(profile, open_times)
