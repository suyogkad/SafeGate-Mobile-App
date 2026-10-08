"""SQLAlchemy ORM models.

All timestamps are stored in UTC (timezone-aware columns).
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class UserRole(str, enum.Enum):
    PARENT = "parent"
    THERAPIST = "therapist"
    ADMIN = "admin"


class SessionStatus(str, enum.Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class RiskLevel(str, enum.Enum):
    NONE = "none"
    CONCERN = "concern"
    URGENT = "urgent"


class AlertLevel(str, enum.Enum):
    CONCERN = "concern"
    URGENT = "urgent"


class AlertStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


def _values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class Base(DeclarativeBase):
    type_annotation_map = {
        UserRole: SAEnum(UserRole, name="userrole", values_callable=_values),
        SessionStatus: SAEnum(SessionStatus, name="sessionstatus", values_callable=_values),
        RiskLevel: SAEnum(RiskLevel, name="risklevel", values_callable=_values),
        AlertLevel: SAEnum(AlertLevel, name="alertlevel", values_callable=_values),
        AlertStatus: SAEnum(AlertStatus, name="alertstatus", values_callable=_values),
    }


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Only meaningful for therapists: pending / approved / rejected.
    therapist_status: Mapped[str] = mapped_column(String(20), default="approved", nullable=False)
    # Bumped to invalidate every token issued before it (force sign-out, password reset).
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Child(Base):
    __tablename__ = "children"

    id: Mapped[uuid.UUID] = _uuid_pk()
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    therapist_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Optional: the parent setup flow does not ask for these, and a placeholder
    # string in an emergency contact field reads like real data to whoever needs
    # it most. Absent is recorded as absent.
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    home_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TherapistProfile(Base):
    __tablename__ = "therapist_profiles"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    specialties: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    __table_args__ = (UniqueConstraint("therapist_id", "start_time", name="uq_therapist_start_time"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    therapist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_booked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TherapySession(Base):
    """A booked session between a child and a therapist."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    therapist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    availability_slot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("availability_slots.id"), unique=True, nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(default=SessionStatus.BOOKED, nullable=False)
    video_room_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SessionNote(Base):
    __tablename__ = "session_notes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, index=True
    )
    therapist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class VisualSchedule(Base):
    __tablename__ = "visual_schedules"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    items: Mapped[list["ScheduleItem"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan", order_by="ScheduleItem.position"
    )


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id: Mapped[uuid.UUID] = _uuid_pk()
    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("visual_schedules.id"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    schedule: Mapped["VisualSchedule"] = relationship(back_populates="items")


class ConversationLog(Base):
    """A single turn of the AI companion, saved after both safety checks."""

    __tablename__ = "conversation_logs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    child_message: Mapped[str] = mapped_column(Text, nullable=False)
    reply: Mapped[str] = mapped_column(Text, nullable=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(default=RiskLevel.NONE, nullable=False)
    classifier_failed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    # Which sitting this turn belongs to: the child's own phone, or the parent's.
    # Null for turns recorded before devices existed.
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_devices.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    level: Mapped[AlertLevel] = mapped_column(nullable=False)
    recipients: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[AlertStatus] = mapped_column(default=AlertStatus.PENDING, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # The therapist's own "Noted": it clears their list only. Acknowledging on the
    # family's behalf stays the parent's action (HANDOFF T09).
    therapist_noted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class ChildAccessLog(Base):
    """Audit trail: who accessed a child's records, what they did, and when."""

    __tablename__ = "child_access_logs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    # Exactly one of these is set: a signed-in adult, or the child's own device.
    accessed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    accessed_by_device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("child_devices.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AdminAuditLog(Base):
    """What an admin did to whom. Never stores message content or secrets."""

    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class AppSetting(Base):
    """An admin-set override of a runtime setting. Never holds secrets (API keys stay in the environment)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[object] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class ChildDevice(Base):
    """A way for a child to use the app, without the child ever having an email or password.

    `linked` is the child's own phone, paired once with a code the parent reads out.
    `parent_hosted` is the parent handing their own phone over for a sitting; it is
    short-lived and made fresh each time. Either way the token it backs can only reach
    child-facing routes, never the parent's account.
    """

    __tablename__ = "child_devices"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # linked | parent_hosted
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Bumped to revoke every token issued for this device (a lost or handed-on phone).
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ChildLinkCode(Base):
    """A short, single-use code a parent reads out so a child can pair their phone.

    Stored in the clear on purpose: it expires in minutes, works once, and only ever
    pairs one specific child. Anyone who could read this table could already read the
    child's records, so hashing it would protect nothing.
    """

    __tablename__ = "child_link_codes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("children.id"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
