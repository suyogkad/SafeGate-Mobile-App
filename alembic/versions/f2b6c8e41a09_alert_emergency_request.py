"""Record a parent asking for emergency services

Revision ID: f2b6c8e41a09
Revises: e5a9d2c1f347
Create Date: 2026-10-13

SafeGate contacts nobody. These two columns only record that a parent said they
asked, and when, so the child can be told plainly what is happening and there is
a record of who decided (HANDOFF rule 17). Never set automatically.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f2b6c8e41a09"
down_revision = "e5a9d2c1f347"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("emergency_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "alerts",
        sa.Column("emergency_requested_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("alerts", "emergency_requested_by")
    op.drop_column("alerts", "emergency_requested_at")
