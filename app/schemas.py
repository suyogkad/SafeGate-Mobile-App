"""Pydantic request/response models."""
import uuid
from datetime import datetime
from typing import Annotated, Literal

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


MeetingKind = Literal["video", "in_person"]


class SessionBookingCreate(BaseModel):
    child_id: uuid.UUID
    availability_slot_id: uuid.UUID
    meeting_kind: MeetingKind = "video"


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
    meeting_kind: MeetingKind
    video_room_url: str | None
    created_at: datetime
    child_name: str | None = None
    therapist_name: str | None = None
    """When the therapist shared their notes with the family, if they have."""
    notes_shared_at: datetime | None = None
    """Whether any notes exist at all. Only ever set for the session's own
    therapist: nobody else needs to know a private draft is sitting there."""
    notes_written: bool | None = None


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


class TherapistAlertRow(BaseModel):
    """A safety alert about one of this therapist's own clients."""

    id: uuid.UUID
    child_id: uuid.UUID
    child_name: str | None
    level: str
    timestamp: datetime
    # Null until the parent taps "I've seen this": the difference between nobody
    # having acted and the family having acted.
    parent_seen_at: datetime | None
    noted_at: datetime | None


class NoteHighlight(BaseModel):
    emoji: str = Field(max_length=8)
    text: str = Field(min_length=1, max_length=300)


class NoteSuggestion(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    line: str = Field(default="", max_length=400)


class SessionNotesUpdate(BaseModel):
    """What a therapist writes. Plain words, no scores (HANDOFF rule 18)."""

    highlights: list[NoteHighlight] = Field(default_factory=list, max_length=3)
    shared: str = Field(default="", max_length=4000)
    try_at_home: list[NoteSuggestion] = Field(default_factory=list, max_length=3)
    working: str = Field(default="", max_length=8000)


class SessionNotesOut(BaseModel):
    """The therapist's view: both parts."""

    session_id: uuid.UUID
    highlights: list[NoteHighlight]
    shared: str
    try_at_home: list[NoteSuggestion]
    working: str
    shared_at: datetime | None
    updated_at: datetime | None


class SharedNotesOut(BaseModel):
    """The family's view. Deliberately has no `working` field at all, so the
    therapist's own notes cannot leak through this shape (HANDOFF rule 21)."""

    session_id: uuid.UUID
    therapist_name: str | None
    highlights: list[NoteHighlight]
    shared: str
    try_at_home: list[NoteSuggestion]
    shared_at: datetime


# ---- Therapist profile, working hours, and goals -------------------------


class GoodForItem(BaseModel):
    emoji: str = Field(default="", max_length=8)
    text: str = Field(min_length=1, max_length=120)


class ClinicOut(BaseModel):
    name: str
    address: str


class TherapistProfileUpdate(BaseModel):
    """What the therapist edits about themselves. Name and email are not here:
    those come from their invitation and change through support."""

    title: str = Field(default="", max_length=60)
    years_with_kids: int | None = Field(default=None, ge=1, le=60)
    blurb: str = Field(default="", max_length=200)
    tagline: str = Field(default="", max_length=200)
    about: str = Field(default="", max_length=4000)
    good_for: list[GoodForItem] = Field(default_factory=list, max_length=3)
    clinic_name: str | None = Field(default=None, max_length=120)
    clinic_address: str | None = Field(default=None, max_length=255)


class TimeRange(BaseModel):
    """Minutes from midnight in the therapist's own timezone. 540 = 9:00 am."""

    start: int = Field(ge=0, le=1439)
    end: int = Field(ge=1, le=1440)


class TimeOffOut(BaseModel):
    id: str
    from_date: str
    to_date: str
    label: str = ""


class TimeOffCreate(BaseModel):
    from_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    to_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    label: str = Field(default="", max_length=80)


WEEKDAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


class WorkingHoursUpdate(BaseModel):
    """The weekly template families are booked against. Saving it rebuilds the
    open slots in the booking window; times a family already booked are kept."""

    weekly: dict[str, list[TimeRange]] = Field(default_factory=dict)
    session_length_min: int = Field(default=50, ge=15, le=180)
    gap_min: int = Field(default=10, ge=0, le=60)
    offers_video: bool = True
    offers_in_person: bool = False
    booking_window_weeks: int = Field(default=3, ge=1, le=12)
    notice_days: int = Field(default=1, ge=0, le=28)
    timezone: str = Field(default="Australia/Sydney", max_length=60)


class WorkingHoursOut(WorkingHoursUpdate):
    time_off: list[TimeOffOut] = Field(default_factory=list)
    """How many open times families can see right now, after the rebuild."""
    open_times: int = 0


class NotifyPrefs(BaseModel):
    """What a therapist wants to hear about. Safety alerts are deliberately absent:
    an alert about a child always reaches their therapist and cannot be turned off."""

    bookings: bool = True
    sharing: bool = True
    notes_reminders: bool = True


class TherapistMeOut(BaseModel):
    """The signed-in therapist's own profile and hours, in one read."""

    id: uuid.UUID
    full_name: str
    email: str
    status: str
    title: str
    years_with_kids: int | None
    blurb: str
    tagline: str
    about: str
    good_for: list[GoodForItem]
    clinic: ClinicOut | None
    notify: NotifyPrefs
    hours: WorkingHoursOut


class TherapistPublicOut(BaseModel):
    """What a parent reads when choosing a therapist: professional details only,
    never an email or a phone number."""

    id: uuid.UUID
    full_name: str
    title: str
    years_with_kids: int | None
    blurb: str
    tagline: str
    about: str
    good_for: list[GoodForItem]
    clinic: ClinicOut | None
    offers_video: bool
    offers_in_person: bool
    session_length_min: int


class GoalsUpdate(BaseModel):
    """Plain sentences a family would recognise. No scores (HANDOFF rule 18)."""

    goals: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(default_factory=list, max_length=4)


class GoalsOut(BaseModel):
    child_id: uuid.UUID
    goals: list[str]
    updated_at: datetime | None
