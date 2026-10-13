"""How a child gets into the app, without ever having an email or a password.

Two ways, both started by the parent and both ending in the same narrowly-scoped
child token (see security.create_child_token):

  linked         the child's own phone, paired once with a short code the parent
                 reads out. Long-lived, revocable, survives restarts.
  parent_hosted  the parent hands their own phone over for a sitting. Short-lived
                 and made fresh each time, so the phone going back in the parent's
                 pocket does not leave a child session open on it.

A child token can only reach child-facing routes. It can never read the parent's
account, another child, or anything carrying a risk level (HANDOFF rule 5).
"""
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    Child,
    ChildCheckin,
    ChildDevice,
    ChildJournalEntry,
    ChildLinkCode,
    ConversationLog,
    User,
    UserRole,
)
from app.db.session import get_db
from app.schemas import (
    CheckinOut,
    ChildDeviceOut,
    ConversationTurnOut,
    ChildLinkCodeOut,
    ChildLinkRequest,
    ChildProfileOut,
    ChildTokenOut,
    JournalEntryOut,
)
from app.security import (
    ChildPrincipal,
    create_child_token,
    get_current_child,
    log_child_access,
    require_role,
)

router = APIRouter(tags=["child access"])

# No vowels, no 0/O/1/I: the parent reads this aloud and the child types it.
_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789"
_CODE_LENGTH = 6


def _new_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


async def _parents_child(db: AsyncSession, child_id: uuid.UUID, parent: User) -> Child:
    child = (await db.execute(select(Child).where(Child.id == child_id))).scalar_one_or_none()
    if child is None or child.parent_id != parent.id or child.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


async def _profile(db: AsyncSession, child: Child) -> ChildProfileOut:
    therapist_name = None
    if child.therapist_id is not None:
        therapist_name = (
            await db.execute(select(User.full_name).where(User.id == child.therapist_id))
        ).scalar_one_or_none()
    parent_user = (
        await db.execute(select(User).where(User.id == child.parent_id))
    ).scalar_one_or_none()
    return ChildProfileOut(
        id=child.id,
        full_name=child.full_name,
        grown_up_name=parent_user.full_name if parent_user else None,
        grown_up_phone=parent_user.phone if parent_user else None,
        therapist_name=therapist_name,
    )


async def _issue(
    db: AsyncSession, child: Child, kind: str, label: str | None, minutes: int, action: str | None = None
) -> ChildTokenOut:
    device = ChildDevice(child_id=child.id, kind=kind, label=label)
    db.add(device)
    await db.commit()
    await db.refresh(device)
    if action:
        await log_child_access(db, child.id, None, action, device_id=device.id)
    token = create_child_token(child.id, device.id, device.token_version, minutes)
    return ChildTokenOut(
        access_token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=minutes),
        child=await _profile(db, child),
    )


# ------------------------------------------------------------ parent side ----


@router.post("/children/{child_id}/link-code", response_model=ChildLinkCodeOut, status_code=201)
async def create_link_code(
    child_id: uuid.UUID,
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> ChildLinkCodeOut:
    """Issue a fresh code for the parent to read out. Any earlier unused code stops working,
    so a code left on a screen an hour ago cannot still pair a phone."""
    child = await _parents_child(db, child_id, parent)
    settings = get_settings()
    now = datetime.now(timezone.utc)

    previous = (
        await db.execute(
            select(ChildLinkCode).where(ChildLinkCode.child_id == child.id, ChildLinkCode.used_at.is_(None))
        )
    ).scalars().all()
    for code in previous:
        code.expires_at = now

    entry = ChildLinkCode(
        child_id=child.id,
        code=_new_code(),
        created_by=parent.id,
        expires_at=now + timedelta(minutes=settings.child_link_code_ttl_minutes),
    )
    db.add(entry)
    await db.commit()
    await log_child_access(db, child.id, parent.id, "link_code_issued")
    return ChildLinkCodeOut(code=entry.code, expires_at=entry.expires_at)


@router.post("/children/{child_id}/child-session", response_model=ChildTokenOut, status_code=201)
async def start_child_session(
    child_id: uuid.UUID,
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> ChildTokenOut:
    """The parent hands their phone over. Short-lived on purpose."""
    child = await _parents_child(db, child_id, parent)
    await log_child_access(db, child.id, parent.id, "child_session_started")
    return await _issue(
        db, child, kind="parent_hosted", label="Parent's phone", minutes=get_settings().child_session_minutes
    )


async def _end_sessions(db: AsyncSession, child: Child, device_id: uuid.UUID | None) -> int:
    """End one sitting, or every sitting for this child. Bumping the token version
    kills tokens already issued, so the phone in the child's hand stops working at
    its next request rather than whenever the token would have expired."""
    stmt = select(ChildDevice).where(ChildDevice.child_id == child.id, ChildDevice.revoked_at.is_(None))
    if device_id is not None:
        stmt = stmt.where(ChildDevice.id == device_id)

    devices = (await db.execute(stmt)).scalars().all()
    if device_id is not None and not devices:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    now = datetime.now(timezone.utc)
    for device in devices:
        device.revoked_at = now
        device.token_version += 1
    await db.commit()
    return len(devices)


@router.get("/children/{child_id}/devices", response_model=list[ChildDeviceOut])
async def list_devices(
    child_id: uuid.UUID,
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> list[ChildDevice]:
    child = await _parents_child(db, child_id, parent)
    rows = (
        await db.execute(
            select(ChildDevice).where(ChildDevice.child_id == child.id).order_by(ChildDevice.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


@router.post("/children/{child_id}/devices/{device_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_device(
    child_id: uuid.UUID,
    device_id: uuid.UUID,
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Unpair a phone. Every token already issued for it stops working immediately."""
    child = await _parents_child(db, child_id, parent)
    await _end_sessions(db, child, device_id)
    await log_child_access(db, child.id, parent.id, "child_device_revoked")


@router.post("/children/{child_id}/devices/end-all", status_code=status.HTTP_204_NO_CONTENT)
async def end_all_sessions(
    child_id: uuid.UUID,
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Stop the child using the app anywhere, right now -- the phone in their hand
    and any sitting left open on the parent's own phone."""
    child = await _parents_child(db, child_id, parent)
    ended = await _end_sessions(db, child, None)
    await log_child_access(db, child.id, parent.id, f"child_sessions_ended({ended})")


@router.get("/children/{child_id}/conversations", response_model=list[ConversationTurnOut])
async def read_conversations(
    child_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    device_id: uuid.UUID | None = None,
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationTurnOut]:
    """What the child said to the companion, and what it said back.

    The child is told plainly that their grown-up can read this, and the product
    depends on that being true (HANDOFF rule 3) -- so the parent gets the real
    words. An admin never does; they only ever see that something was flagged.

    `device_id` narrows it to one sitting, which is how a parent reviews what
    happened on a particular phone.
    """
    child = await _parents_child(db, child_id, parent)

    stmt = select(ConversationLog).where(ConversationLog.child_id == child.id)
    if device_id is not None:
        stmt = stmt.where(ConversationLog.device_id == device_id)

    rows = (
        await db.execute(stmt.order_by(ConversationLog.timestamp.desc()).limit(limit).offset(offset))
    ).scalars().all()

    labels = {
        d.id: d.label or d.kind
        for d in (
            await db.execute(select(ChildDevice).where(ChildDevice.child_id == child.id))
        ).scalars().all()
    }

    await log_child_access(db, child.id, parent.id, "conversations_read")
    return [
        ConversationTurnOut(
            id=r.id,
            timestamp=r.timestamp,
            child_message=r.child_message,
            reply=r.reply,
            flagged=r.flagged,
            risk_level=r.risk_level.value,
            device_id=r.device_id,
            device_label=labels.get(r.device_id),
        )
        for r in rows
    ]


# ------------------------------------------------------------- child side ----


@router.post("/auth/child/link", response_model=ChildTokenOut, status_code=201)
async def link_child_device(payload: ChildLinkRequest, db: AsyncSession = Depends(get_db)) -> ChildTokenOut:
    """The child types the code their grown-up read out. Codes are single-use."""
    now = datetime.now(timezone.utc)
    entry = (
        await db.execute(
            select(ChildLinkCode).where(
                ChildLinkCode.code == payload.code.strip().upper().replace(" ", ""),
                ChildLinkCode.used_at.is_(None),
                ChildLinkCode.expires_at > now,
            )
        )
    ).scalar_one_or_none()
    # One message for every failure: a wrong code must not reveal whether it ever existed.
    if entry is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code didn't work")

    child = (await db.execute(select(Child).where(Child.id == entry.child_id))).scalar_one_or_none()
    if child is None or child.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code didn't work")

    entry.used_at = now
    await db.commit()
    return await _issue(
        db,
        child,
        kind="linked",
        label="Child's phone",
        minutes=get_settings().child_device_token_days * 24 * 60,
        action="child_device_linked",
    )


@router.get("/auth/child/me", response_model=ChildProfileOut)
async def child_me(
    principal: ChildPrincipal = Depends(get_current_child), db: AsyncSession = Depends(get_db)
) -> ChildProfileOut:
    return await _profile(db, principal.child)


@router.get("/children/{child_id}/checkins", response_model=list[CheckinOut])
async def read_checkins(
    child_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> list[CheckinOut]:
    """How the child said they were feeling, in their own words.

    Parent-only, like the conversations. An admin never reaches this: they see that
    something was flagged, never what a child chose or wrote. A therapist sees it only
    if the family shares it (HANDOFF rule 19), which is not built yet.
    """
    child = await _parents_child(db, child_id, parent)
    rows = (
        await db.execute(
            select(ChildCheckin)
            .where(ChildCheckin.child_id == child.id)
            .order_by(ChildCheckin.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()
    await log_child_access(db, child.id, parent.id, "checkins_read")
    return [
        CheckinOut(
            id=r.id,
            created_at=r.created_at,
            mood=r.mood,
            words=list(r.words or []),
            topics=list(r.topics or []),
            note=r.note,
            device_id=r.device_id,
        )
        for r in rows
    ]


@router.get("/children/{child_id}/journal", response_model=list[JournalEntryOut])
async def read_journal(
    child_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    parent: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> list[JournalEntryOut]:
    """What the child wrote in their journal.

    The child's app tells them plainly that their grown-up can read this (rule 3), and
    the product depends on that being true -- so the parent gets the real words. An
    admin never does.
    """
    child = await _parents_child(db, child_id, parent)
    rows = (
        await db.execute(
            select(ChildJournalEntry)
            .where(ChildJournalEntry.child_id == child.id)
            .order_by(ChildJournalEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()
    await log_child_access(db, child.id, parent.id, "journal_read")
    return [
        JournalEntryOut(
            id=r.id, created_at=r.created_at, prompt=r.prompt, text=r.text, device_id=r.device_id
        )
        for r in rows
    ]
