"""Records what an admin did. Stores field *names* and ids only -- never message
content, passwords, or other personal data values.
"""
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AdminAuditLog


async def log_admin_action(
    db: AsyncSession,
    admin_id: uuid.UUID,
    action: str,
    target_type: str,
    target_id: uuid.UUID | None = None,
    detail: str | None = None,
) -> None:
    db.add(AdminAuditLog(admin_id=admin_id, action=action, target_type=target_type, target_id=target_id, detail=detail))
    await db.commit()
