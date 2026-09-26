"""Scheduling, rescheduling, and cancelling session reminder jobs.

Reminders never delay the booking response -- they're just scheduled here,
and the actual send happens later on the shared scheduler's own timer.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

import app.scheduler
from app.config import get_settings
from app.db.models import Child, SessionStatus, TherapySession, User
from app.db.session import AsyncSessionLocal
from app.notifications import get_notification_sender

settings = get_settings()


def _job_id(session_id: uuid.UUID) -> str:
    return f"session-reminder-{session_id}"


def schedule_session_reminder(session_id: uuid.UUID, start_time: datetime) -> None:
    run_at = start_time - timedelta(minutes=settings.reminder_lead_minutes)
    if run_at <= datetime.now(timezone.utc):
        return  # too close to the session to send a "before it starts" reminder
    app.scheduler.scheduler.add_job(
        _send_reminder,
        trigger="date",
        run_date=run_at,
        args=[session_id],
        id=_job_id(session_id),
        replace_existing=True,
    )


def cancel_session_reminder(session_id: uuid.UUID) -> None:
    job = app.scheduler.scheduler.get_job(_job_id(session_id))
    if job is not None:
        job.remove()


async def _send_reminder(session_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(TherapySession).where(TherapySession.id == session_id))
        session_obj = result.scalar_one_or_none()
        if session_obj is None or session_obj.status != SessionStatus.BOOKED:
            return  # cancelled or rescheduled since this job was scheduled

        child_result = await db.execute(select(Child).where(Child.id == session_obj.child_id))
        child = child_result.scalar_one_or_none()
        if child is None:
            return

        parent_result = await db.execute(select(User).where(User.id == child.parent_id))
        parent = parent_result.scalar_one_or_none()
        if parent is None:
            return

        sender = get_notification_sender()
        when = session_obj.start_time.strftime("%Y-%m-%d %H:%M UTC")
        message = f"Reminder: {child.full_name}'s session is scheduled for {when}."
        if parent.phone:
            await sender.send_sms(parent.phone, message)
        await sender.send_email(parent.email, "Upcoming session reminder", message)
