"""How a session is held: video call or in person

Revision ID: d1c47e95a8b2
Revises: c3f81ba2d470
Create Date: 2026-10-08

A family chooses when they book, and both sides have to agree -- a parent
travelling to a clinic for a video call is a real failure, not a cosmetic one.
Existing sessions become video calls: that is how every one of them was booked,
since in person was never an option before this.
"""
import sqlalchemy as sa
from alembic import op

revision = "d1c47e95a8b2"
down_revision = "c3f81ba2d470"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("meeting_kind", sa.String(length=10), nullable=False, server_default="video"),
    )


def downgrade() -> None:
    op.drop_column("sessions", "meeting_kind")
