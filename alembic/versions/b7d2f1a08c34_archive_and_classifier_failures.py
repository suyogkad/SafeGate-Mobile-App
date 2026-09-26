"""child archiving and classifier-failure tracking

Revision ID: b7d2f1a08c34
Revises: a1c4e7d90b12
Create Date: 2026-09-23

"""
from alembic import op
import sqlalchemy as sa

revision = "b7d2f1a08c34"
down_revision = "a1c4e7d90b12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("children", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "conversation_logs",
        sa.Column("classifier_failed", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("conversation_logs", "classifier_failed")
    op.drop_column("children", "archived_at")
