"""Turning a therapist's weekly hours into the real slots families book.

The therapist edits a weekly template ("Thursdays, 3 pm to 6 pm, 50 minutes").
Families book concrete `AvailabilitySlot` rows, stored in UTC. This module is the
one place that converts one into the other.

Two rules matter more than tidiness:
  * A slot a family has already booked is never moved or removed. Changing your
    hours must not cancel a child's session behind their back; the therapist
    cancels or reschedules it themselves, which tells the family.
  * Slots in the past are left alone, so history stays readable.
"""
import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AvailabilitySlot, TherapistProfile

WEEKDAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def zone_of(name: str) -> ZoneInfo:
    """The therapist's zone, falling back to the platform's own region rather
    than to UTC -- a wrong fallback would silently shift every open time."""
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("Australia/Sydney")


def _parse_day(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _days_off(profile: TherapistProfile) -> set[date]:
    off: set[date] = set()
    for entry in profile.time_off or []:
        start = _parse_day(str(entry.get("from_date") or entry.get("from") or ""))
        end = _parse_day(str(entry.get("to_date") or entry.get("to") or "")) or start
        if start is None or end is None or end < start:
            continue
        day = start
        while day <= end:
            off.add(day)
            day += timedelta(days=1)
    return off


def planned_slots(profile: TherapistProfile, now: datetime) -> list[tuple[datetime, datetime]]:
    """Every open time the weekly template asks for, as UTC start/end pairs.

    Both ends of the window come from the therapist's own settings: nothing inside
    `notice_days` (families need warning too) and nothing beyond the booking window.
    """
    tz = zone_of(profile.timezone)
    weekly = profile.weekly_hours or {}
    length = profile.session_length_min
    step = length + profile.gap_min
    if length <= 0 or step <= 0:
        return []

    today_local = now.astimezone(tz).date()
    first = today_local + timedelta(days=profile.notice_days)
    last = today_local + timedelta(weeks=profile.booking_window_weeks)
    off = _days_off(profile)

    out: list[tuple[datetime, datetime]] = []
    day = first
    while day <= last:
        if day not in off:
            for rng in weekly.get(WEEKDAY_KEYS[day.weekday()], []) or []:
                start_min, end_min = int(rng["start"]), int(rng["end"])
                minute = start_min
                while minute + length <= end_min:
                    local = datetime.combine(day, time(minute // 60, minute % 60), tzinfo=tz)
                    start_utc = local.astimezone(timezone.utc)
                    if start_utc > now:
                        out.append((start_utc, start_utc + timedelta(minutes=length)))
                    minute += step
        day += timedelta(days=1)
    return out


async def rebuild_open_slots(db: AsyncSession, profile: TherapistProfile) -> int:
    """Make the therapist's bookable slots match their hours. Returns how many
    open times families can see afterwards. Does not commit."""
    now = datetime.now(timezone.utc)
    wanted = {start: end for start, end in planned_slots(profile, now)}

    existing = list(
        (
            await db.execute(
                select(AvailabilitySlot).where(
                    AvailabilitySlot.therapist_id == profile.user_id,
                    AvailabilitySlot.start_time > now,
                )
            )
        )
        .scalars()
        .all()
    )

    # An open slot goes if the template no longer asks for it, or asks for a
    # different length -- a 50-minute slot left behind after a switch to 60 would
    # let a family book a session shorter than the therapist now runs.
    stale = {
        s.id for s in existing if not s.is_booked and wanted.get(s.start_time) != s.end_time
    }
    if stale:
        await db.execute(delete(AvailabilitySlot).where(AvailabilitySlot.id.in_(stale)))

    kept = {s.start_time for s in existing if s.id not in stale}
    for start, end in wanted.items():
        if start in kept:
            continue
        db.add(
            AvailabilitySlot(
                id=uuid.uuid4(),
                therapist_id=profile.user_id,
                start_time=start,
                end_time=end,
                is_booked=False,
            )
        )
    await db.flush()

    open_now = (
        await db.execute(
            select(AvailabilitySlot).where(
                AvailabilitySlot.therapist_id == profile.user_id,
                AvailabilitySlot.start_time > now,
                AvailabilitySlot.is_booked.is_(False),
            )
        )
    ).scalars().all()
    return len(open_now)
