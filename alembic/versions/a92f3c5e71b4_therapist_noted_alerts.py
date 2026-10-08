"""a therapist can mark an alert noted, which clears their own list only

Revision ID: a92f3c5e71b4
Revises: f41b7c9d2e58
Create Date: 2026-10-08

"""
from alembic import op
import sqlalchemy as sa

revision = "a92f3c5e71b4"
down_revision = "f41b7c9d2e58"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("therapist_noted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("alerts", "therapist_noted_at")
