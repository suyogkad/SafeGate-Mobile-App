"""Admin-only user management: create, list, view, update, verify, and secure accounts.

Accounts are deactivated rather than deleted, so audit history (session notes,
access logs, alerts) tied to a user id is never lost. Every change is written
to the admin audit log.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_admin_action
from app.db.models import User, UserRole
from app.db.session import get_db
from app.schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    PasswordReset,
    UserOut,
    VerificationUpdate,
)
from app.security import hash_password, require_role

router = APIRouter(prefix="/admin/users", tags=["admin"])
admin_only = require_role(UserRole.ADMIN)

_SORTS = {"created_at": User.created_at, "full_name": User.full_name, "email": User.email}


async def _get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)
) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        phone=payload.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await log_admin_action(db, admin.id, "user.created", "user", user.id, f"role={payload.role.value}")
    return user


@router.get("", response_model=list[UserOut])
async def list_users(
    response: Response,
    role: UserRole | None = Query(default=None),
    therapist_status: str | None = Query(default=None),
    q: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="created_at"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(admin_only),
) -> list[User]:
    filters = []
    if role is not None:
        filters.append(User.role == role)
    if therapist_status is not None:
        filters.append(User.role == UserRole.THERAPIST)
        filters.append(User.therapist_status == therapist_status)
    if q:
        like = f"%{q.strip()}%"
        filters.append(or_(User.full_name.ilike(like), User.email.ilike(like)))

    total = (await db.execute(select(func.count()).select_from(User).where(*filters))).scalar_one()
    response.headers["X-Total-Count"] = str(total)

    column = _SORTS.get(sort, User.created_at)
    stmt = select(User).where(*filters).order_by(column.asc() if order == "asc" else column.desc())
    result = await db.execute(stmt.limit(limit).offset(offset))
    return list(result.scalars().all())


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(admin_only)) -> User:
    return await _get_user(db, user_id)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(admin_only),
) -> User:
    user = await _get_user(db, user_id)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("is_active") is False and user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't deactivate your own account")

    for field, value in changes.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)

    if "is_active" in changes:
        action = "user.reactivated" if changes["is_active"] else "user.deactivated"
        await log_admin_action(db, admin.id, action, "user", user.id)
    other = sorted(k for k in changes if k != "is_active")
    if other:
        await log_admin_action(db, admin.id, "user.updated", "user", user.id, "fields=" + ",".join(other))
    return user


@router.post("/{user_id}/verification", response_model=UserOut)
async def set_therapist_verification(
    user_id: uuid.UUID,
    payload: VerificationUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(admin_only),
) -> User:
    user = await _get_user(db, user_id)
    if user.role != UserRole.THERAPIST:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only therapist accounts are verified")
    user.therapist_status = payload.status
    await db.commit()
    await db.refresh(user)
    await log_admin_action(db, admin.id, f"therapist.{payload.status}", "user", user.id)
    return user


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    user_id: uuid.UUID,
    payload: PasswordReset,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(admin_only),
) -> None:
    user = await _get_user(db, user_id)
    user.hashed_password = hash_password(payload.new_password)
    user.token_version += 1  # signs the person out everywhere
    await db.commit()
    await log_admin_action(db, admin.id, "user.password_reset", "user", user.id)


@router.post("/{user_id}/force-logout", status_code=status.HTTP_204_NO_CONTENT)
async def force_logout(
    user_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(admin_only)
) -> None:
    user = await _get_user(db, user_id)
    user.token_version += 1
    await db.commit()
    await log_admin_action(db, admin.id, "user.force_logout", "user", user.id)
