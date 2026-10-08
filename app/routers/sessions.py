"""Therapist availability and session booking/reschedule/cancellation.

Double booking is prevented by the database itself: sessions.availability_slot_id
is a UNIQUE foreign key (see the initial migration), so two concurrent booking
attempts for the same slot can never both succeed -- the loser gets a clean 409.
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AvailabilitySlot,
    Child,
    SessionNote,
    SessionStatus,
    TherapistProfile,
    TherapySession,
    User,
    UserRole,
)
from app.db.session import get_db
from app.reminders import cancel_session_reminder, schedule_session_reminder
from app.schemas import (
    AvailabilitySlotCreate,
    AvailabilitySlotOut,
    SessionBookingCreate,
    SessionJoinOut,
    SessionOut,
    SessionRescheduleRequest,
)
from app.security import get_current_user, log_child_access, require_role, require_session_access
from app.video import ensure_room, get_video_provider, room_window

router = APIRouter(tags=["sessions"])
logger = logging.getLogger(__name__)


async def _enrich_sessions(
    db: AsyncSession, sessions: list[TherapySession], reader: User | None = None
) -> list[SessionOut]:
    """Attaches child/therapist names -- a therapist or parent has no other
    way to see the other party's name, since user lookup is otherwise
    admin-only.

    Also says where the session's notes are. `notes_shared_at` is for everyone: a
    family is told when their therapist shares notes, which is the point of
    sharing them. `notes_written` is only ever set for the session's own
    therapist, so nobody else learns that private working notes exist.
    """
    child_ids = {s.child_id for s in sessions}
    therapist_ids = {s.therapist_id for s in sessions}
    child_names: dict = {}
    therapist_names: dict = {}
    if child_ids:
        result = await db.execute(select(Child.id, Child.full_name).where(Child.id.in_(child_ids)))
        child_names = dict(result.all())
    if therapist_ids:
        result = await db.execute(select(User.id, User.full_name).where(User.id.in_(therapist_ids)))
        therapist_names = dict(result.all())
    notes: dict = {}
    if sessions:
        rows = await db.execute(
            select(SessionNote.session_id, SessionNote.shared_at).where(
                SessionNote.session_id.in_({s.id for s in sessions})
            )
        )
        notes = dict(rows.all())

    return [
        SessionOut.model_validate(s).model_copy(
            update={
                "child_name": child_names.get(s.child_id),
                "therapist_name": therapist_names.get(s.therapist_id),
                "notes_shared_at": notes.get(s.id),
                "notes_written": (
                    s.id in notes
                    if reader is not None
                    and reader.role == UserRole.THERAPIST
                    and reader.id == s.therapist_id
                    else None
                ),
            }
        )
        for s in sessions
    ]


@router.post("/availability", response_model=AvailabilitySlotOut, status_code=status.HTTP_201_CREATED)
async def create_availability_slot(
    payload: AvailabilitySlotCreate,
    current_user: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> AvailabilitySlot:
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")

    slot = AvailabilitySlot(therapist_id=current_user.id, start_time=payload.start_time, end_time=payload.end_time)
    db.add(slot)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You already have a slot at this start time"
        )
    await db.refresh(slot)
    return slot


@router.get("/availability/{therapist_id}", response_model=list[AvailabilitySlotOut])
async def list_availability(
    therapist_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AvailabilitySlot]:
    stmt = (
        select(AvailabilitySlot)
        .where(AvailabilitySlot.therapist_id == therapist_id)
        .where(AvailabilitySlot.is_booked.is_(False))
        .where(AvailabilitySlot.start_time > datetime.now(timezone.utc))
        .order_by(AvailabilitySlot.start_time)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.delete("/availability/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(AvailabilitySlot).where(AvailabilitySlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if slot is None or slot.therapist_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove a booked slot")

    await db.delete(slot)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a slot that has session history"
        )


async def complete_finished_sessions(db: AsyncSession) -> int:
    """Mark sessions that have already ended as completed.

    A booking whose end time has passed is finished, whether or not anyone opened
    the app afterwards. Leaving it "booked" makes a session from a fortnight ago
    still look upcoming, and still offer a Cancel button for something that has
    already happened.

    Done on read rather than on a timer: the scheduler's job store is in memory and
    does not survive a restart, so a swept-on-a-timer approach would silently miss
    sessions. This is idempotent and costs an UPDATE that usually matches nothing.
    """
    result = await db.execute(
        update(TherapySession)
        .where(
            TherapySession.status == SessionStatus.BOOKED,
            TherapySession.end_time < datetime.now(timezone.utc),
        )
        .values(status=SessionStatus.COMPLETED)
    )
    if result.rowcount:
        await db.commit()
    return result.rowcount or 0


async def _book_slot(
    db: AsyncSession, child: Child, slot: AvailabilitySlot, meeting_kind: str = "video"
) -> TherapySession:
    if slot.therapist_id != child.therapist_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This slot does not belong to the child's assigned therapist",
        )
    if slot.is_booked:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This slot is already booked")
    if slot.start_time <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot book a slot in the past")

    session_obj = TherapySession(
        child_id=child.id,
        therapist_id=slot.therapist_id,
        availability_slot_id=slot.id,
        start_time=slot.start_time,
        end_time=slot.end_time,
        status=SessionStatus.BOOKED,
        meeting_kind=meeting_kind,
    )
    slot.is_booked = True
    db.add(session_obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This slot is already booked")
    await db.refresh(session_obj)

    if session_obj.meeting_kind != "video":
        schedule_session_reminder(session_obj.id, session_obj.start_time)
        return session_obj

    # A video outage must not lose a confirmed booking: the room is recreated on
    # demand when someone actually joins.
    try:
        session_obj.video_room_url = await ensure_room(session_obj)
        await db.commit()
        await db.refresh(session_obj)
    except Exception:
        await db.rollback()
        logger.warning("Could not pre-create a video room for session %s", session_obj.id)

    schedule_session_reminder(session_obj.id, session_obj.start_time)
    return session_obj


async def _ensure_meeting_kind_offered(db: AsyncSession, therapist_id: uuid.UUID, kind: str) -> None:
    """A family can only pick a way of meeting the therapist actually offers.

    In person also needs a clinic address: "in person" with nowhere to go is worse
    than not offering it at all.
    """
    profile = (
        await db.execute(select(TherapistProfile).where(TherapistProfile.user_id == therapist_id))
    ).scalar_one_or_none()
    if profile is None:
        # A therapist who has not set their hours up yet still takes video calls.
        if kind == "in_person":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This therapist does not see families in person",
            )
        return
    if kind == "video" and not profile.offers_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This therapist does not take video calls"
        )
    if kind == "in_person" and not (profile.offers_in_person and profile.clinic_name and profile.clinic_address):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This therapist does not see families in person",
        )


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def book_session(
    payload: SessionBookingCreate,
    current_user: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    child_result = await db.execute(select(Child).where(Child.id == payload.child_id))
    child = child_result.scalar_one_or_none()
    if child is None or child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")
    if child.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    if child.therapist_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This child has no assigned therapist yet"
        )

    slot_result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.id == payload.availability_slot_id)
    )
    slot = slot_result.scalar_one_or_none()
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found")

    await _ensure_meeting_kind_offered(db, slot.therapist_id, payload.meeting_kind)

    session_obj = await _book_slot(db, child, slot, payload.meeting_kind)
    await log_child_access(db, child.id, current_user.id, "book_session")
    return (await _enrich_sessions(db, [session_obj]))[0]


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    await complete_finished_sessions(db)

    if current_user.role == UserRole.ADMIN:
        stmt = select(TherapySession)
    elif current_user.role == UserRole.THERAPIST:
        stmt = select(TherapySession).where(TherapySession.therapist_id == current_user.id)
    else:
        child_ids_result = await db.execute(select(Child.id).where(Child.parent_id == current_user.id))
        child_ids = list(child_ids_result.scalars().all())
        stmt = select(TherapySession).where(TherapySession.child_id.in_(child_ids))

    result = await db.execute(stmt)
    return await _enrich_sessions(db, list(result.scalars().all()), current_user)


@router.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session(
    current_user: User = Depends(get_current_user),
    session_obj: TherapySession = Depends(require_session_access("view_session")),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    # Keep the detail view honest even when it is opened directly.
    if await complete_finished_sessions(db):
        await db.refresh(session_obj)
    return (await _enrich_sessions(db, [session_obj], current_user))[0]


@router.post("/sessions/{session_id}/join", response_model=SessionJoinOut)
async def join_session(
    current_user: User = Depends(get_current_user),
    session_obj: TherapySession = Depends(require_session_access("join_video")),
    db: AsyncSession = Depends(get_db),
) -> SessionJoinOut:
    """Issue a single-participant link into this session's video room.

    Only the child's own parent and their assigned therapist may join. Admins can see
    a session's details but are deliberately not admitted to a live therapy call --
    oversight does not extend to sitting in on the session.
    """
    if session_obj.status != SessionStatus.BOOKED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session is not booked")
    if session_obj.meeting_kind != "video":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This session is in person, not a video call"
        )

    child_result = await db.execute(select(Child).where(Child.id == session_obj.child_id))
    child = child_result.scalar_one_or_none()
    is_therapist = current_user.role == UserRole.THERAPIST and session_obj.therapist_id == current_user.id
    is_parent = current_user.role == UserRole.PARENT and child is not None and child.parent_id == current_user.id
    if not (is_therapist or is_parent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the child's parent and assigned therapist can join"
        )

    opens_at, expires_at = room_window(session_obj.start_time, session_obj.end_time)
    now = datetime.now(timezone.utc)
    if now < opens_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This session's room is not open yet"
        )
    if now > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session has already ended")

    provider = get_video_provider()
    try:
        room_url = await ensure_room(session_obj, provider)
        if room_url != session_obj.video_room_url:
            session_obj.video_room_url = room_url
            await db.commit()
        join_url = await provider.create_join_url(
            room_url, display_name=current_user.full_name, is_host=is_therapist, expires_at=expires_at
        )
    except HTTPException:
        raise
    except Exception:
        logger.warning("Could not issue a video join link for session %s", session_obj.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="The video service is unavailable right now"
        )

    return SessionJoinOut(join_url=join_url, expires_at=expires_at, is_host=is_therapist)


@router.put("/sessions/{session_id}/reschedule", response_model=SessionOut)
async def reschedule_session(
    payload: SessionRescheduleRequest,
    current_user: User = Depends(get_current_user),
    session_obj: TherapySession = Depends(require_session_access("reschedule")),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    child_result = await db.execute(select(Child).where(Child.id == session_obj.child_id))
    child = child_result.scalar_one_or_none()
    if current_user.role != UserRole.PARENT or child is None or child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the child's parent can reschedule")
    if session_obj.status != SessionStatus.BOOKED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a booked session can be rescheduled")

    new_slot_result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.id == payload.new_availability_slot_id)
    )
    new_slot = new_slot_result.scalar_one_or_none()
    if new_slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found")
    if new_slot.therapist_id != child.therapist_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This slot does not belong to the child's assigned therapist",
        )
    if new_slot.is_booked:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This slot is already booked")
    if new_slot.start_time <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot book a slot in the past")

    old_slot_result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.id == session_obj.availability_slot_id)
    )
    old_slot = old_slot_result.scalar_one_or_none()

    session_obj.availability_slot_id = new_slot.id
    session_obj.start_time = new_slot.start_time
    session_obj.end_time = new_slot.end_time
    new_slot.is_booked = True
    if old_slot is not None:
        old_slot.is_booked = False

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This slot is already booked")
    await db.refresh(session_obj)

    cancel_session_reminder(session_obj.id)
    schedule_session_reminder(session_obj.id, session_obj.start_time)

    # The room's expiry still points at the old time slot; move it, or the call
    # would shut off partway through the rescheduled session.
    try:
        _, expires_at = room_window(session_obj.start_time, session_obj.end_time)
        session_obj.video_room_url = await get_video_provider().create_room(session_obj.id, expires_at)
        await db.commit()
        await db.refresh(session_obj)
    except Exception:
        await db.rollback()
        logger.warning("Could not move the video room for rescheduled session %s", session_obj.id)

    return (await _enrich_sessions(db, [session_obj]))[0]


@router.post("/sessions/{session_id}/cancel", response_model=SessionOut)
async def cancel_session(
    current_user: User = Depends(get_current_user),
    session_obj: TherapySession = Depends(require_session_access("cancel")),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    child_result = await db.execute(select(Child).where(Child.id == session_obj.child_id))
    child = child_result.scalar_one_or_none()
    if current_user.role != UserRole.PARENT or child is None or child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the child's parent can cancel")
    if session_obj.status != SessionStatus.BOOKED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a booked session can be cancelled")

    session_obj.status = SessionStatus.CANCELLED
    slot_result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.id == session_obj.availability_slot_id)
    )
    slot = slot_result.scalar_one_or_none()
    if slot is not None:
        slot.is_booked = False

    await db.commit()
    await db.refresh(session_obj)

    cancel_session_reminder(session_obj.id)
    return (await _enrich_sessions(db, [session_obj]))[0]
