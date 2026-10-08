"""A non-admin directory so a parent can choose a therapist for their child.

Only what a therapist chose to publish about their practice: their name, what they
do, and the clinic address if they see families in person. Never an email, a phone
number, or anything about another family.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TherapistProfile, User, UserRole
from app.db.session import get_db
from app.schemas import ClinicOut, GoodForItem, TherapistPublicOut
from app.security import get_current_user

router = APIRouter(prefix="/therapists", tags=["therapists"])


def _public(user: User, profile: TherapistProfile | None) -> TherapistPublicOut:
    """A therapist who has not filled their profile in yet still appears, with
    blank fields rather than invented ones: the app shows its own empty state."""
    clinic = (
        ClinicOut(name=profile.clinic_name, address=profile.clinic_address)
        if profile and profile.clinic_name and profile.clinic_address
        else None
    )
    return TherapistPublicOut(
        id=user.id,
        full_name=user.full_name,
        title=profile.title if profile else "",
        years_with_kids=profile.years_with_kids if profile else None,
        blurb=profile.blurb if profile else "",
        tagline=profile.tagline if profile else "",
        about=(profile.bio or "") if profile else "",
        good_for=[GoodForItem(**g) for g in (profile.good_for or [])] if profile else [],
        clinic=clinic,
        offers_video=profile.offers_video if profile else True,
        offers_in_person=bool(clinic) and bool(profile and profile.offers_in_person),
        session_length_min=profile.session_length_min if profile else 50,
    )


# Only therapists an admin has verified appear to families.
_APPROVED = (
    User.role == UserRole.THERAPIST,
    User.is_active.is_(True),
    User.therapist_status == "approved",
)


@router.get("", response_model=list[TherapistPublicOut])
async def list_therapists(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[TherapistPublicOut]:
    rows = (
        await db.execute(
            select(User, TherapistProfile)
            .outerjoin(TherapistProfile, TherapistProfile.user_id == User.id)
            .where(*_APPROVED)
            .order_by(User.full_name)
        )
    ).all()
    return [_public(user, profile) for user, profile in rows]


@router.get("/{therapist_id}", response_model=TherapistPublicOut)
async def get_therapist(
    therapist_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TherapistPublicOut:
    row = (
        await db.execute(
            select(User, TherapistProfile)
            .outerjoin(TherapistProfile, TherapistProfile.user_id == User.id)
            .where(User.id == therapist_id, *_APPROVED)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapist not found")
    user, profile = row
    return _public(user, profile)
