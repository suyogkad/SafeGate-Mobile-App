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

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Child, ChildDevice, ChildLinkCode, User, UserRole
from app.db.session import get_db
from app.schemas import (
    ChildDeviceOut,
    ChildLinkCodeOut,
    ChildLinkRequest,
    ChildProfileOut,
    ChildTokenOut,
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


async def _issue(db: AsyncSession, child: Child, kind: str, label: str | None, minutes: int) -> ChildTokenOut:
    device = ChildDevice(child_id=child.id, kind=kind, label=label)
    db.add(device)
    await db.commit()
    await db.refresh(device)
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
    device = (
        await db.execute(
            select(ChildDevice).where(ChildDevice.id == device_id, ChildDevice.child_id == child.id)
        )
    ).scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    device.revoked_at = datetime.now(timezone.utc)
    device.token_version += 1
    await db.commit()
    await log_child_access(db, child.id, parent.id, "child_device_revoked")


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
    issued = await _issue(
        db, child, kind="linked", label="Child's phone", minutes=get_settings().child_device_token_days * 24 * 60
    )
    await log_child_access(db, child.id, None, "child_device_linked")
    return issued


@router.get("/auth/child/me", response_model=ChildProfileOut)
async def child_me(
    principal: ChildPrincipal = Depends(get_current_child), db: AsyncSession = Depends(get_db)
) -> ChildProfileOut:
    return await _profile(db, principal.child)
