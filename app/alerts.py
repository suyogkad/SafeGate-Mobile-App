"""Alerts to the therapist and/or parent when a child's message is flagged.

Never contacts emergency services automatically -- only notifies people who
know the child. Always run as a background task (see app/routers/companion.py)
so alerting never delays the child's reply.
"""
import uuid

from sqlalchemy import select

from app.db.models import Alert, AlertLevel, AlertStatus, Child, RiskLevel, User
from app.db.session import AsyncSessionLocal
from app.notifications import get_notification_sender


NO_RECIPIENTS = "(none)"


async def send_alerts_for_risk(child_id: uuid.UUID, risk: RiskLevel) -> None:
    if risk == RiskLevel.NONE:
        return

    async with AsyncSessionLocal() as db:
        child_result = await db.execute(select(Child).where(Child.id == child_id))
        child = child_result.scalar_one_or_none()
        if child is None:
            return

        parent_result = await db.execute(select(User).where(User.id == child.parent_id))
        parent = parent_result.scalar_one_or_none()
        therapist = None
        if child.therapist_id is not None:
            therapist_result = await db.execute(select(User).where(User.id == child.therapist_id))
            therapist = therapist_result.scalar_one_or_none()

        recipients: list[User] = []
        if risk == RiskLevel.CONCERN:
            level = AlertLevel.CONCERN
            if therapist is not None:
                recipients.append(therapist)
        else:  # URGENT
            level = AlertLevel.URGENT
            if parent is not None:
                recipients.append(parent)
            if therapist is not None:
                recipients.append(therapist)

        if not recipients:
            # Nobody to notify (e.g. a "concern" for a child with no therapist).
            # Record it as failed so an admin can see it instead of it vanishing.
            db.add(Alert(child_id=child.id, level=level, recipients=NO_RECIPIENTS, status=AlertStatus.FAILED))
            await db.commit()
            return

        alert = Alert(
            child_id=child.id,
            level=level,
            recipients=", ".join(r.email for r in recipients),
            status=AlertStatus.PENDING,
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)

        sender = get_notification_sender()
        subject = f"{level.value.upper()} alert for {child.full_name}"
        message = f"A message from {child.full_name} was flagged as {level.value}. Please check the app for details."

        try:
            for recipient in recipients:
                await sender.send_email(recipient.email, subject, message)
                if recipient.phone:
                    await sender.send_sms(recipient.phone, message)
            alert.status = AlertStatus.SENT
        except Exception:
            alert.status = AlertStatus.FAILED
        await db.commit()
