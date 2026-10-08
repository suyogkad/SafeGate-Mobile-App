"""Pydantic request/response models."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models import RiskLevel, SessionStatus, UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole
    phone: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    phone: str | None
    is_active: bool
    therapist_status: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole
    phone: str | None = None


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    is_active: bool | None = None


class AvailabilitySlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailabilitySlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    therapist_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    is_booked: bool
    created_at: datetime


class SessionBookingCreate(BaseModel):
    child_id: uuid.UUID
    availability_slot_id: uuid.UUID


class SessionRescheduleRequest(BaseModel):
    new_availability_slot_id: uuid.UUID


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    child_id: uuid.UUID
    therapist_id: uuid.UUID
    availability_slot_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    status: SessionStatus
    video_room_url: str | None
    created_at: datetime
    child_name: str | None = None
    therapist_name: str | None = None


class SessionJoinOut(BaseModel):
    """A one-participant link into a session's video room."""

    join_url: str
    expires_at: datetime
    is_host: bool


class ScheduleItemCreate(BaseModel):
    position: int = Field(ge=0)
    title: str = Field(min_length=1, max_length=255)
    image_url: str | None = None


class ScheduleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int
    title: str
    image_url: str | None
    created_at: datetime


class VisualScheduleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    items: list[ScheduleItemCreate] = Field(default_factory=list)


class VisualScheduleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    items: list[ScheduleItemCreate] | None = None


class VisualScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    child_id: uuid.UUID
    title: str
    created_by: uuid.UUID
    created_at: datetime
    items: list[ScheduleItemOut]


class CompanionMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class CompanionReplyRequest(BaseModel):
    child_id: uuid.UUID
    messages: list[CompanionMessage] = Field(min_length=1)


class CompanionReplyResponse(BaseModel):
    reply: str
    flagged: bool
    risk_level: RiskLevel


class ChildCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    date_of_birth: datetime | None = None
    emergency_contact_name: str | None = Field(default=None, min_length=1, max_length=255)
    emergency_contact_phone: str | None = Field(default=None, min_length=1, max_length=50)
    home_address: str | None = Field(default=None, min_length=1)
    therapist_id: uuid.UUID | None = None


class ChildUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    date_of_birth: datetime | None = None
    emergency_contact_name: str | None = Field(default=None, min_length=1, max_length=255)
    emergency_contact_phone: str | None = Field(default=None, min_length=1, max_length=50)
    home_address: str | None = Field(default=None, min_length=1)
    therapist_id: uuid.UUID | None = None


class ChildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parent_id: uuid.UUID
    therapist_id: uuid.UUID | None
    full_name: str
    date_of_birth: datetime | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    home_address: str | None
    created_at: datetime
    therapist_name: str | None = None
    parent_name: str | None = None
    archived_at: datetime | None = None


class TherapistDirectoryEntry(BaseModel):
    id: uuid.UUID
    full_name: str


# ---- Admin operations ----------------------------------------------------


class VerificationUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=72)


class AdminChildUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    emergency_contact_name: str | None = Field(default=None, min_length=1, max_length=255)
    emergency_contact_phone: str | None = Field(default=None, min_length=1, max_length=50)
    home_address: str | None = Field(default=None, min_length=1)
    therapist_id: uuid.UUID | None = None


class AlertRow(BaseModel):
    id: uuid.UUID
    child_id: uuid.UUID
    child_name: str | None
    level: str
    recipients: str
    status: str
    timestamp: datetime
    no_recipients: bool
    acknowledged_at: datetime | None
    acknowledged_by_name: str | None


class FlaggedConversationRow(BaseModel):
    """Metadata only -- deliberately no message or reply text."""

    id: uuid.UUID
    child_id: uuid.UUID
    child_name: str | None
    timestamp: datetime
    risk_level: str
    is_fallback: bool
    classifier_failed: bool = False
    reviewed_at: datetime | None
    reviewed_by_name: str | None


class DailyFlagCount(BaseModel):
    date: str
    concern: int
    urgent: int
    fallback: int


class SafetyStats(BaseModel):
    days: int
    flagged_total: int
    concern: int
    urgent: int
    fallback_replies: int
    classifier_failures: int = 0
    alerts_total: int
    alerts_failed: int
    alerts_unacknowledged: int
    unreviewed_flagged: int
    daily: list[DailyFlagCount]


class AccessLogRow(BaseModel):
    """One access to a child's records. The actor is either an adult account or the
    child's own device, so `user_id` is null for child-initiated access."""

    id: uuid.UUID
    timestamp: datetime
    user_id: uuid.UUID | None
    user_name: str | None
    user_role: str | None
    device_id: uuid.UUID | None = None
    child_id: uuid.UUID
    child_name: str | None
    action: str


class AdminActionRow(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    admin_id: uuid.UUID
    admin_name: str | None
    action: str
    target_type: str
    target_id: uuid.UUID | None
    detail: str | None


class SettingsUpdate(BaseModel):
    """Editable runtime settings. Send only the keys to change; null resets a key to its environment default.
    Secrets (API keys, JWT secret, database URL) are deliberately not editable here."""

    companion_rate_limit_per_minute: int | None = Field(default=None, ge=1, le=120)
    companion_session_max_messages: int | None = Field(default=None, ge=1, le=500)
    companion_session_window_minutes: int | None = Field(default=None, ge=1, le=1440)
    reminder_lead_minutes: int | None = Field(default=None, ge=0, le=10080)
    safety_country: str | None = Field(default=None, min_length=2, max_length=2)
    ai_provider: Literal["mock", "groq", "gemini"] | None = None
    ai_companion_model: str | None = Field(default=None, min_length=1, max_length=100)
    ai_classifier_model: str | None = Field(default=None, min_length=1, max_length=100)
    ai_classifier_timeout_seconds: float | None = Field(default=None, ge=1, le=120)
    video_provider: Literal["mock", "daily"] | None = None
    therapist_auto_approve: bool | None = None


# ---- Child access (no email, no password) --------------------------------


class ChildLinkCodeOut(BaseModel):
    """Shown to the parent so they can read it out to the child."""

    code: str
    expires_at: datetime


class ChildLinkRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)


class ChildProfileOut(BaseModel):
    """What the child's own app may know about itself. Deliberately no risk level,
    and no therapist notes (HANDOFF rule 5)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    grown_up_name: str | None = None
    grown_up_phone: str | None = None
    therapist_name: str | None = None


class ChildTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    child: ChildProfileOut


class ChildDeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    child_id: uuid.UUID
    kind: str
    label: str | None
    last_seen_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class TranscriptOut(BaseModel):
    """What the child's recording was heard as. Shown back for them to check or
    fix before anything is sent (HANDOFF rule 13)."""

    text: str


class ConversationTurnOut(BaseModel):
    """One exchange, as the child's own parent may read it.

    The child is told plainly that their grown-up can read this (HANDOFF rule 3),
    so the parent gets the real words -- unlike an admin, who only ever sees that
    something was flagged.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    timestamp: datetime
    child_message: str
    reply: str
    flagged: bool
    risk_level: str
    device_id: uuid.UUID | None
    device_label: str | None = None
