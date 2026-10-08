"""Session notes, in two parts.

The family sees highlights, a short message and things to try at home -- and only
once the therapist shares them. The therapist's working notes are theirs alone:
the parent's route returns a shape that has no field for them at all, so they
cannot leak by accident (HANDOFF rule 21).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Child, SessionNote, TherapySession, User, UserRole
from app.db.session import get_db
from app.schemas import SessionNotesOut, SessionNotesUpdate, SharedNotesOut
from app.security import get_current_user, log_child_access

router = APIRouter(tags=["session notes"])


async def _session_for_therapist(db: AsyncSession, session_id: uuid.UUID, user: User) -> TherapySession:
    session_obj = (
        await db.execute(select(TherapySession).where(TherapySession.id == session_id))
    ).scalar_one_or_none()
    if session_obj is None or session_obj.therapist_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session_obj


def _as_out(session_id: uuid.UUID, note: SessionNote | None) -> SessionNotesOut:
    if note is None:
        return SessionNotesOut(
            session_id=session_id, highlights=[], shared="", try_at_home=[], working="", shared_at=None, updated_at=None
        )
    return SessionNotesOut(
        session_id=session_id,
        highlights=note.highlights,
        shared=note.shared,
        try_at_home=note.try_at_home,
        working=note.working,
        shared_at=note.shared_at,
        updated_at=note.updated_at,
    )


@router.get("/sessions/{session_id}/notes", response_model=SessionNotesOut)
async def read_notes(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionNotesOut:
    """The therapist's own view, both parts. Empty when nothing is written yet."""
    if current_user.role != UserRole.THERAPIST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
    session_obj = await _session_for_therapist(db, session_id, current_user)
    note = (
        await db.execute(select(SessionNote).where(SessionNote.session_id == session_id))
    ).scalar_one_or_none()
    await log_child_access(db, session_obj.child_id, current_user.id, "session_notes_read")
    return _as_out(session_id, note)


@router.put("/sessions/{session_id}/notes", response_model=SessionNotesOut)
async def save_notes(
    session_id: uuid.UUID,
    payload: SessionNotesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionNotesOut:
    """Saves a draft. Sharing is a separate, deliberate action."""
    if current_user.role != UserRole.THERAPIST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
    session_obj = await _session_for_therapist(db, session_id, current_user)

    note = (
        await db.execute(select(SessionNote).where(SessionNote.session_id == session_id))
    ).scalar_one_or_none()
    if note is None:
        note = SessionNote(session_id=session_id, therapist_id=current_user.id)
        db.add(note)

    note.highlights = [h.model_dump() for h in payload.highlights]
    note.shared = payload.shared
    note.try_at_home = [t.model_dump() for t in payload.try_at_home]
    note.working = payload.working
    await db.commit()
    await db.refresh(note)

    await log_child_access(db, session_obj.child_id, current_user.id, "session_notes_saved")
    return _as_out(session_id, note)


@router.post("/sessions/{session_id}/notes/share", response_model=SessionNotesOut)
async def share_notes(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionNotesOut:
    """Lets the family read the shared part. Re-sharing after an edit is the same
    action, so a correction reaches them too."""
    if current_user.role != UserRole.THERAPIST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
    session_obj = await _session_for_therapist(db, session_id, current_user)

    note = (
        await db.execute(select(SessionNote).where(SessionNote.session_id == session_id))
    ).scalar_one_or_none()
    if note is None or not (note.shared.strip() or note.highlights or note.try_at_home):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Write something for the family before sharing"
        )

    note.shared_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(note)

    await log_child_access(db, session_obj.child_id, current_user.id, "session_notes_shared")
    return _as_out(session_id, note)


@router.get("/sessions/{session_id}/shared-notes", response_model=SharedNotesOut)
async def read_shared_notes(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SharedNotesOut:
    """What the child's own parent may read. Never the therapist's working notes."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")

    session_obj = (
        await db.execute(select(TherapySession).where(TherapySession.id == session_id))
    ).scalar_one_or_none()
    if session_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    child = (await db.execute(select(Child).where(Child.id == session_obj.child_id))).scalar_one_or_none()
    if child is None or child.parent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    note = (
        await db.execute(select(SessionNote).where(SessionNote.session_id == session_id))
    ).scalar_one_or_none()
    if note is None or note.shared_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No notes have been shared yet")

    therapist_name = (
        await db.execute(select(User.full_name).where(User.id == note.therapist_id))
    ).scalar_one_or_none()
    await log_child_access(db, child.id, current_user.id, "shared_notes_read")
    return SharedNotesOut(
        session_id=session_id,
        therapist_name=therapist_name,
        highlights=note.highlights,
        shared=note.shared,
        try_at_home=note.try_at_home,
        shared_at=note.shared_at,
    )
