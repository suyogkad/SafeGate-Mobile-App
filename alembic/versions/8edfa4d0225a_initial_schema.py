"""initial schema

Revision ID: 8edfa4d0225a
Revises:
Create Date: 2026-09-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "8edfa4d0225a"
down_revision = None
branch_labels = None
depends_on = None

user_role = postgresql.ENUM("parent", "therapist", "admin", name="userrole", create_type=False)
session_status = postgresql.ENUM("booked", "cancelled", "completed", name="sessionstatus", create_type=False)
risk_level = postgresql.ENUM("none", "concern", "urgent", name="risklevel", create_type=False)
alert_level = postgresql.ENUM("concern", "urgent", name="alertlevel", create_type=False)
alert_status = postgresql.ENUM("pending", "sent", "failed", name="alertstatus", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    session_status.create(bind, checkfirst=True)
    risk_level.create(bind, checkfirst=True)
    alert_level.create(bind, checkfirst=True)
    alert_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "children",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("therapist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.DateTime(timezone=True), nullable=True),
        sa.Column("emergency_contact_name", sa.String(255), nullable=False),
        sa.Column("emergency_contact_phone", sa.String(50), nullable=False),
        sa.Column("home_address", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_children_parent_id", "children", ["parent_id"])
    op.create_index("ix_children_therapist_id", "children", ["therapist_id"])

    op.create_table(
        "therapist_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("specialties", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "availability_slots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("therapist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_booked", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("therapist_id", "start_time", name="uq_therapist_start_time"),
    )
    op.create_index("ix_availability_slots_therapist_id", "availability_slots", ["therapist_id"])

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("therapist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "availability_slot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("availability_slots.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", session_status, nullable=False, server_default="booked"),
        sa.Column("video_room_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sessions_child_id", "sessions", ["child_id"])
    op.create_index("ix_sessions_therapist_id", "sessions", ["therapist_id"])

    op.create_table(
        "session_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("therapist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("note_text", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_session_notes_session_id", "session_notes", ["session_id"])

    op.create_table(
        "visual_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_visual_schedules_child_id", "visual_schedules", ["child_id"])

    op.create_table(
        "schedule_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "schedule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("visual_schedules.id"), nullable=False
        ),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_schedule_items_schedule_id", "schedule_items", ["schedule_id"])

    op.create_table(
        "conversation_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("child_message", sa.Text, nullable=False),
        sa.Column("reply", sa.Text, nullable=False),
        sa.Column("flagged", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("risk_level", risk_level, nullable=False, server_default="none"),
    )
    op.create_index("ix_conversation_logs_child_id", "conversation_logs", ["child_id"])

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("level", alert_level, nullable=False),
        sa.Column("recipients", sa.String(500), nullable=False),
        sa.Column("status", alert_status, nullable=False, server_default="pending"),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_alerts_child_id", "alerts", ["child_id"])

    op.create_table(
        "child_access_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("accessed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_child_access_logs_child_id", "child_access_logs", ["child_id"])


def downgrade() -> None:
    op.drop_table("child_access_logs")
    op.drop_table("alerts")
    op.drop_table("conversation_logs")
    op.drop_table("schedule_items")
    op.drop_table("visual_schedules")
    op.drop_table("session_notes")
    op.drop_table("sessions")
    op.drop_table("availability_slots")
    op.drop_table("therapist_profiles")
    op.drop_table("children")
    op.drop_table("users")

    bind = op.get_bind()
    alert_status.drop(bind, checkfirst=True)
    alert_level.drop(bind, checkfirst=True)
    risk_level.drop(bind, checkfirst=True)
    session_status.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
