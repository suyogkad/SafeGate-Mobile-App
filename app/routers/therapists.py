"""A minimal, non-admin directory so a parent can pick a therapist to assign
to their child. Only exposes name -- not email, phone, or any other detail.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, UserRole
from app.db.session import get_db
from app.schemas import TherapistDirectoryEntry
from app.security import get_current_user

router = APIRouter(prefix="/therapists", tags=["therapists"])


@router.get("", response_model=list[TherapistDirectoryEntry])
async def list_therapists(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.THERAPIST, User.is_active.is_(True), User.therapist_status == "approved")
        .order_by(User.full_name)
    )
    return list(result.scalars().all())
