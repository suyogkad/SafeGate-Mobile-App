"""The AI companion endpoint.

Every child message goes through the defence layer in this exact order:
check the child's message, then call the companion, then check the reply,
then save the log. No step is skipped. Flagged messages never reach the AI at
all -- they get a fixed script from scripts.py instead.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import safety, scripts
from app.ai.prompts import COMPANION_SYSTEM_PROMPT
from app.ai.providers import generate
from app.alerts import send_alerts_for_risk
from app.config import get_settings
from app.db.models import Child, ConversationLog, RiskLevel, User, UserRole
from app.db.session import get_db
from app.schemas import CompanionReplyRequest, CompanionReplyResponse
from app.security import Actor, get_actor, log_child_access

router = APIRouter(prefix="/companion", tags=["companion"])


async def _enforce_limits(db: AsyncSession, child_id: uuid.UUID, actor: Actor) -> None:
    settings = get_settings()
    now = datetime.now(timezone.utc)

    minute_ago = now - timedelta(minutes=1)
    minute_count = (
        await db.execute(
            select(func.count())
            .select_from(ConversationLog)
            .where(ConversationLog.child_id == child_id, ConversationLog.timestamp >= minute_ago)
        )
    ).scalar_one()
    if minute_count >= settings.companion_rate_limit_per_minute:
        await log_child_access(db, child_id, actor.user_id, "companion_rate_limited", device_id=actor.device_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many messages, please wait a moment"
        )

    window_ago = now - timedelta(minutes=settings.companion_session_window_minutes)
    window_count = (
        await db.execute(
            select(func.count())
            .select_from(ConversationLog)
            .where(ConversationLog.child_id == child_id, ConversationLog.timestamp >= window_ago)
        )
    ).scalar_one()
    if window_count >= settings.companion_session_max_messages:
        await log_child_access(db, child_id, actor.user_id, "companion_session_capped", device_id=actor.device_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="This session has reached its message limit, please take a break",
        )


@router.post("/reply", response_model=CompanionReplyResponse)
async def companion_reply(
    payload: CompanionReplyRequest,
    background_tasks: BackgroundTasks,
    actor: Actor = Depends(get_actor),
    db: AsyncSession = Depends(get_db),
) -> CompanionReplyResponse:
    # Either the child on their own linked phone, or their parent on theirs.
    if actor.is_child:
        child = actor.principal.child
        if child.id != payload.child_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")
    else:
        if actor.user.role != UserRole.PARENT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
        child_result = await db.execute(select(Child).where(Child.id == payload.child_id))
        child = child_result.scalar_one_or_none()
        if child is None or child.parent_id != actor.user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this child")
    if child.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")

    if payload.messages[-1].role != "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="The last message must be from the child"
        )

    await _enforce_limits(db, child.id, actor)

    child_message = payload.messages[-1].content
    settings = get_settings()

    # a. Check the child's message.
    risk, classifier_failed = await safety.classify_child_message(child_message)

    if risk != RiskLevel.NONE:
        # b. Flagged: skip the AI entirely, use a fixed script.
        reply = (
            scripts.urgent_script(settings.safety_country)
            if risk == RiskLevel.URGENT
            else scripts.concern_script(settings.safety_country)
        )
        flagged = True
    else:
        # c. Call the companion, then d. check the reply before returning it.
        try:
            history = [{"role": m.role, "content": m.content} for m in payload.messages]
            draft_reply = await generate(
                system=COMPANION_SYSTEM_PROMPT, messages=history, model=settings.ai_companion_model
            )
            is_safe = await safety.check_reply(draft_reply)
        except Exception:
            draft_reply = None
            is_safe = False

        if is_safe:
            reply = draft_reply
            flagged = False
        else:
            reply = scripts.fallback_script()
            flagged = True

    # e. Save the conversation log.
    log = ConversationLog(
        child_id=child.id,
        child_message=child_message,
        reply=reply,
        flagged=flagged,
        risk_level=risk,
        classifier_failed=classifier_failed,
    )
    db.add(log)
    await db.commit()

    await log_child_access(db, child.id, actor.user_id, "companion_reply", device_id=actor.device_id)

    # Alerts run as a background task so they never delay the child's reply.
    if risk != RiskLevel.NONE:
        background_tasks.add_task(send_alerts_for_risk, child.id, risk)

    return CompanionReplyResponse(reply=reply, flagged=flagged, risk_level=risk)
