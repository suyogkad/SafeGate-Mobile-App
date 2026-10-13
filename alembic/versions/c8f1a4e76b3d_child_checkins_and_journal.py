"""A child's check-ins and journal entries

Revision ID: c8f1a4e76b3d
Revises: b4e82f0d7a16
Create Date: 2026-10-13

Both hold things a child wrote or chose about themselves, so both carry what the
safety layer decided about them: free text a child writes is a child message, and
safety rule 2 says every child message goes through the defence layer.

The child's app tells them their grown-up can read these, so the parent reads the
real words. An admin never does -- same as conversations.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c8f1a4e76b3d"
down_revision = "b4e82f0d7a16"
branch_labels = None
depends_on = None

RISK = postgresql.ENUM("none", "concern", "urgent", name="risklevel", create_type=False)


def upgrade() -> None:
    op.create_table(
        "child_checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_devices.id"), nullable=True),
        sa.Column("mood", sa.String(length=30), nullable=False),
        sa.Column("words", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("topics", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("risk_level", RISK, nullable=False, server_default="none"),
        sa.Column("flagged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("classifier_failed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_child_checkins_child_id", "child_checkins", ["child_id"])

    op.create_table(
        "child_journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_devices.id"), nullable=True),
        sa.Column("prompt", sa.String(length=200), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("risk_level", RISK, nullable=False, server_default="none"),
        sa.Column("flagged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("classifier_failed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_child_journal_entries_child_id", "child_journal_entries", ["child_id"])


def downgrade() -> None:
    op.drop_index("ix_child_journal_entries_child_id", table_name="child_journal_entries")
    op.drop_table("child_journal_entries")
    op.drop_index("ix_child_checkins_child_id", table_name="child_checkins")
    op.drop_table("child_checkins")
