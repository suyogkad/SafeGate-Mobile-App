"""Therapist profile details, working hours, and per-child goals

Revision ID: c3f81ba2d470
Revises: b7e4a1d93c06
Create Date: 2026-10-08

The therapist_profiles table existed from Stage 1 with only a bio and specialties
and no endpoints. This fills it out with what the therapist's own screens need --
what families read, and the weekly hours the bookable slots are generated from --
and adds child_goals, which the therapist writes and the family can read.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c3f81ba2d470"
down_revision = "b7e4a1d93c06"
branch_labels = None
depends_on = None

NEW_COLUMNS = [
    ("title", sa.String(length=60), "''"),
    ("blurb", sa.String(length=200), "''"),
    ("tagline", sa.String(length=200), "''"),
    ("timezone", sa.String(length=60), "'Australia/Sydney'"),
]


def upgrade() -> None:
    for name, type_, default in NEW_COLUMNS:
        op.add_column("therapist_profiles", sa.Column(name, type_, nullable=False, server_default=sa.text(default)))
    op.add_column("therapist_profiles", sa.Column("years_with_kids", sa.Integer(), nullable=True))
    op.add_column(
        "therapist_profiles",
        sa.Column("good_for", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column("therapist_profiles", sa.Column("clinic_name", sa.String(length=120), nullable=True))
    op.add_column("therapist_profiles", sa.Column("clinic_address", sa.String(length=255), nullable=True))
    op.add_column(
        "therapist_profiles",
        sa.Column("weekly_hours", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column(
        "therapist_profiles",
        sa.Column("time_off", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column("therapist_profiles", sa.Column("session_length_min", sa.Integer(), nullable=False, server_default="50"))
    op.add_column("therapist_profiles", sa.Column("gap_min", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("therapist_profiles", sa.Column("offers_video", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(
        "therapist_profiles", sa.Column("offers_in_person", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column("therapist_profiles", sa.Column("booking_window_weeks", sa.Integer(), nullable=False, server_default="3"))
    op.add_column("therapist_profiles", sa.Column("notice_days", sa.Integer(), nullable=False, server_default="1"))
    op.add_column(
        "therapist_profiles",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "child_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False, unique=True),
        sa.Column("therapist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("goals", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_child_goals_child_id", "child_goals", ["child_id"])


def downgrade() -> None:
    op.drop_index("ix_child_goals_child_id", table_name="child_goals")
    op.drop_table("child_goals")
    for name in (
        "updated_at",
        "notice_days",
        "booking_window_weeks",
        "offers_in_person",
        "offers_video",
        "gap_min",
        "session_length_min",
        "time_off",
        "weekly_hours",
        "clinic_address",
        "clinic_name",
        "good_for",
        "years_with_kids",
        "timezone",
        "tagline",
        "blurb",
        "title",
    ):
        op.drop_column("therapist_profiles", name)
