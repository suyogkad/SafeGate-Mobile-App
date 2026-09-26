"""Child records: creation, viewing, and editing.

Access is restricted to the child's own parent, their assigned therapist, or an
admin -- enforced via the require_child_access dependency, not just in responses.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Child, User, UserRole
from app.db.session import get_db
from app.schemas import ChildCreate, ChildOut, ChildUpdate
from app.security import get_current_user, log_child_access, require_child_access, require_role

router = APIRouter(prefix="/children", tags=["children"])


async def _enrich(db: AsyncSession, children: list[Child]) -> list[ChildOut]:
    """Attaches the assigned therapist's name -- a parent has no other way to
    see it, since user lookup is otherwise admin-only.
    """
    therapist_ids = {c.therapist_id for c in children if c.therapist_id is not None}
    names: dict = {}
    if therapist_ids:
        result = await db.execute(select(User.id, User.full_name).where(User.id.in_(therapist_ids)))
        names = dict(result.all())
    return [
        ChildOut.model_validate(c).model_copy(update={"therapist_name": names.get(c.therapist_id)})
        for c in children
    ]


async def ensure_assignable_therapist(db: AsyncSession, therapist_id) -> None:
    if therapist_id is None:
        return
    result = await db.execute(
        select(User.id).where(
            User.id == therapist_id,
            User.role == UserRole.THERAPIST,
            User.is_active.is_(True),
            User.therapist_status == "approved",
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That therapist is not available for assignment")


@router.post("", response_model=ChildOut, status_code=201)
async def create_child(
    payload: ChildCreate,
    current_user: User = Depends(require_role(UserRole.PARENT)),
    db: AsyncSession = Depends(get_db),
) -> ChildOut:
    await ensure_assignable_therapist(db, payload.therapist_id)
    child = Child(parent_id=current_user.id, **payload.model_dump())
    db.add(child)
    await db.commit()
    await db.refresh(child)
    await log_child_access(db, child.id, current_user.id, "create")
    return (await _enrich(db, [child]))[0]


@router.get("", response_model=list[ChildOut])
async def list_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChildOut]:
    if current_user.role == UserRole.ADMIN:
        stmt = select(Child)
    elif current_user.role == UserRole.PARENT:
        stmt = select(Child).where(Child.parent_id == current_user.id)
    else:
        stmt = select(Child).where(Child.therapist_id == current_user.id)
    if current_user.role != UserRole.ADMIN:
        stmt = stmt.where(Child.archived_at.is_(None))

    result = await db.execute(stmt)
    children = list(result.scalars().all())
    for child in children:
        await log_child_access(db, child.id, current_user.id, "list")
    return await _enrich(db, children)


@router.get("/{child_id}", response_model=ChildOut)
async def get_child(
    child: Child = Depends(require_child_access("view")), db: AsyncSession = Depends(get_db)
) -> ChildOut:
    return (await _enrich(db, [child]))[0]


@router.put("/{child_id}", response_model=ChildOut)
async def update_child(
    payload: ChildUpdate,
    current_user: User = Depends(get_current_user),
    child: Child = Depends(require_child_access("update")),
    db: AsyncSession = Depends(get_db),
) -> ChildOut:
    if current_user.role != UserRole.PARENT or child.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the child's parent can edit this record"
        )

    changes = payload.model_dump(exclude_unset=True)
    if "therapist_id" in changes:
        await ensure_assignable_therapist(db, changes["therapist_id"])
    for field, value in changes.items():
        setattr(child, field, value)
    await db.commit()
    await db.refresh(child)
    return (await _enrich(db, [child]))[0]
