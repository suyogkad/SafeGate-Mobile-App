"""Child-message and companion-reply safety checks.

PLACEHOLDER: the keyword list below MUST be reviewed and approved by a
qualified clinician before any real child uses this. Do not remove this marker.

The keyword list runs first and, on a match, short-circuits straight to that
risk level without ever calling the model. Only messages that pass the
keyword list reach the model classifier. Every failure mode (a classifier
error, a timeout, invalid JSON, or an unrecognised risk value) fails closed to
"concern" -- never to "none". The reply check fails closed to "unsafe".
"""
import asyncio
import json

from app.ai.prompts import REPLY_CHECK_SYSTEM_PROMPT, RISK_CLASSIFIER_SYSTEM_PROMPT
from app.ai.providers import generate
from app.config import get_settings
from app.db.models import RiskLevel

URGENT_KEYWORDS = [
    "kill myself",
    "want to die",
    "end my life",
    "ending my life",
    "suicide",
    "suicidal",
    "hurt myself badly",
    "have a plan to die",
    "no reason to live",
]

CONCERN_KEYWORDS = [
    "hate myself",
    "want to disappear",
    "nobody would care",
    "nobody would notice",
    "self harm",
    "self-harm",
    "cutting myself",
    "bullied",
    "being hurt",
    "hitting me",
    "scared to go home",
    "meltdown",
    "shutdown",
    "can't stop crying",
]


def _keyword_match(message: str, keywords: list[str]) -> bool:
    normalized = message.lower()
    return any(keyword in normalized for keyword in keywords)


async def classify_child_message(message: str) -> tuple[RiskLevel, bool]:
    """Returns (risk, classifier_failed). classifier_failed is True only when the
    model call failed and the result is the fail-closed default."""
    if _keyword_match(message, URGENT_KEYWORDS):
        return RiskLevel.URGENT, False
    if _keyword_match(message, CONCERN_KEYWORDS):
        return RiskLevel.CONCERN, False

    settings = get_settings()
    try:
        raw = await asyncio.wait_for(
            generate(
                system=RISK_CLASSIFIER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": message}],
                model=settings.ai_classifier_model,
                max_tokens=400,
                json_mode=True,
            ),
            timeout=settings.ai_classifier_timeout_seconds,
        )
        risk = json.loads(raw)["risk"]
        return RiskLevel(risk), False
    except Exception:
        return RiskLevel.CONCERN, True


async def check_child_message(message: str) -> RiskLevel:
    return (await classify_child_message(message))[0]


async def check_reply(reply: str) -> bool:
    settings = get_settings()
    try:
        raw = await asyncio.wait_for(
            generate(
                system=REPLY_CHECK_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": reply}],
                model=settings.ai_classifier_model,
                max_tokens=400,
                json_mode=True,
            ),
            timeout=settings.ai_classifier_timeout_seconds,
        )
        return json.loads(raw)["safe"] is True
    except Exception:
        return False
