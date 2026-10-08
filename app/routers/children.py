"""Child records: creation, viewing, and editing.

Access is restricted to the child's own parent, their assigned therapist, or an
admin -- enforced via the require_child_access dependency, not just in responses.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Child, ChildGoal, User, UserRole
from app.db.session import get_db
from app.schemas import ChildCreate, ChildOut, ChildUpdate, GoalsOut, GoalsUpdate
from app.security import get_current_user, log_child_access, require_child_access, require_role

router = APIRouter(prefix="/children", tags=["children"])


async def _enrich(db: AsyncSession, children: list[Child]) -> list[ChildOut]:
    """Attaches the assigned therapist's and the parent's names.

    Neither a parent nor a therapist can look up users (that is admin-only), so the
    names each of them legitimately needs have to travel with the child record: the
    parent needs the therapist's name, the therapist needs the family's.
    """
    wanted = {c.therapist_id for c in children if c.therapist_id is not None} | {c.parent_id for c in children}
    names: dict = {}
    if wanted:
        result = await db.execute(select(User.id, User.full_name).where(User.id.in_(wanted)))
        names = dict(result.all())
    return [
        ChildOut.model_validate(c).model_copy(
            update={"therapist_name": names.get(c.therapist_id), "parent_name": names.get(c.parent_id)}
        )
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


@router.get("/{child_id}/goals", response_model=GoalsOut)
async def read_goals(
    child: Child = Depends(require_child_access("view_goals")),
    db: AsyncSession = Depends(get_db),
) -> GoalsOut:
    """What the therapist is working towards with this child, in plain words.

    The family can read them: goals are written for them to recognise, and a parent
    seeing the same three sentences their therapist sees is the point.
    """
    row = (await db.execute(select(ChildGoal).where(ChildGoal.child_id == child.id))).scalar_one_or_none()
    if row is None:
        return GoalsOut(child_id=child.id, goals=[], updated_at=None)
    return GoalsOut(child_id=child.id, goals=list(row.goals or []), updated_at=row.updated_at)


@router.put("/{child_id}/goals", response_model=GoalsOut)
async def write_goals(
    payload: GoalsUpdate,
    current_user: User = Depends(get_current_user),
    child: Child = Depends(require_child_access("update_goals")),
    db: AsyncSession = Depends(get_db),
) -> GoalsOut:
    """Only the child's own therapist writes goals. A parent reads them but does
    not set them, and an admin never touches clinical content."""
    if current_user.role != UserRole.THERAPIST or child.therapist_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only this child's therapist can write goals",
        )

    goals = [g.strip() for g in payload.goals if g.strip()]
    row = (await db.execute(select(ChildGoal).where(ChildGoal.child_id == child.id))).scalar_one_or_none()
    if row is None:
        row = ChildGoal(child_id=child.id, therapist_id=current_user.id, goals=goals)
        db.add(row)
    else:
        row.goals = goals
        row.therapist_id = current_user.id
    await db.commit()
    await db.refresh(row)
    return GoalsOut(child_id=child.id, goals=list(row.goals or []), updated_at=row.updated_at)
