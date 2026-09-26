"""Visual (picture-based) daily routines for a child.

Access follows the same three-way rule as other child records: the child's
own parent, their assigned therapist, or an admin -- enforced by
require_child_access, which also writes the access-log entry.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Child, ScheduleItem, User, VisualSchedule
from app.db.session import get_db
from app.schemas import VisualScheduleCreate, VisualScheduleOut, VisualScheduleUpdate
from app.security import get_current_user, require_child_access

router = APIRouter(prefix="/children/{child_id}/schedules", tags=["schedules"])


async def _get_schedule_with_items(db: AsyncSession, schedule_id: uuid.UUID, child_id: uuid.UUID) -> VisualSchedule:
    result = await db.execute(
        select(VisualSchedule)
        .options(selectinload(VisualSchedule.items))
        .where(VisualSchedule.id == schedule_id, VisualSchedule.child_id == child_id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visual schedule not found")
    return schedule


@router.post("", response_model=VisualScheduleOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: VisualScheduleCreate,
    current_user: User = Depends(get_current_user),
    child: Child = Depends(require_child_access("create_schedule")),
    db: AsyncSession = Depends(get_db),
) -> VisualSchedule:
    schedule = VisualSchedule(child_id=child.id, title=payload.title, created_by=current_user.id)
    schedule.items = [
        ScheduleItem(position=item.position, title=item.title, image_url=item.image_url) for item in payload.items
    ]
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule, attribute_names=["items"])
    return schedule


@router.get("", response_model=list[VisualScheduleOut])
async def list_schedules(
    child: Child = Depends(require_child_access("list_schedules")),
    db: AsyncSession = Depends(get_db),
) -> list[VisualSchedule]:
    result = await db.execute(
        select(VisualSchedule)
        .options(selectinload(VisualSchedule.items))
        .where(VisualSchedule.child_id == child.id)
    )
    return list(result.scalars().all())


@router.get("/{schedule_id}", response_model=VisualScheduleOut)
async def get_schedule(
    schedule_id: uuid.UUID,
    child: Child = Depends(require_child_access("view_schedule")),
    db: AsyncSession = Depends(get_db),
) -> VisualSchedule:
    return await _get_schedule_with_items(db, schedule_id, child.id)


@router.put("/{schedule_id}", response_model=VisualScheduleOut)
async def update_schedule(
    schedule_id: uuid.UUID,
    payload: VisualScheduleUpdate,
    child: Child = Depends(require_child_access("update_schedule")),
    db: AsyncSession = Depends(get_db),
) -> VisualSchedule:
    schedule = await _get_schedule_with_items(db, schedule_id, child.id)

    if payload.title is not None:
        schedule.title = payload.title
    if payload.items is not None:
        schedule.items = [
            ScheduleItem(position=item.position, title=item.title, image_url=item.image_url)
            for item in payload.items
        ]

    await db.commit()
    await db.refresh(schedule, attribute_names=["items"])
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: uuid.UUID,
    child: Child = Depends(require_child_access("delete_schedule")),
    db: AsyncSession = Depends(get_db),
) -> None:
    schedule = await _get_schedule_with_items(db, schedule_id, child.id)
    await db.delete(schedule)
    await db.commit()
