"""What a therapist wants to hear about

Revision ID: e5a9d2c1f347
Revises: d1c47e95a8b2
Create Date: 2026-10-08

Safety alerts are deliberately not a preference: an alert about a child always
reaches their therapist. These three cover the rest.
"""
import sqlalchemy as sa
from alembic import op

revision = "e5a9d2c1f347"
down_revision = "d1c47e95a8b2"
branch_labels = None
depends_on = None

COLUMNS = ("notify_bookings", "notify_sharing", "notify_notes_reminders")


def upgrade() -> None:
    for name in COLUMNS:
        op.add_column(
            "therapist_profiles",
            sa.Column(name, sa.Boolean(), nullable=False, server_default=sa.true()),
        )


def downgrade() -> None:
    for name in COLUMNS:
        op.drop_column("therapist_profiles", name)
