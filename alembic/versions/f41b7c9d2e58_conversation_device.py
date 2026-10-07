"""attribute each conversation turn to the session it happened in

Revision ID: f41b7c9d2e58
Revises: e8a3b1c45d26
Create Date: 2026-10-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f41b7c9d2e58"
down_revision = "e8a3b1c45d26"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "conversation_logs",
        sa.Column("device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_devices.id"), nullable=True),
    )
    op.create_index("ix_conversation_logs_device_id", "conversation_logs", ["device_id"])


def downgrade() -> None:
    op.drop_index("ix_conversation_logs_device_id", table_name="conversation_logs")
    op.drop_column("conversation_logs", "device_id")
