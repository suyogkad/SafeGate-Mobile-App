"""What a parent wants to hear about

Revision ID: a7d3e9b15c42
Revises: f2b6c8e41a09
Create Date: 2026-10-13

Safety alerts are deliberately not a preference: an alert about a child always
reaches their parent. "Tell me each time they check in or write" starts off,
because a notification for every small thing trains a parent to ignore them.
"""
import sqlalchemy as sa
from alembic import op

revision = "a7d3e9b15c42"
down_revision = "f2b6c8e41a09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("notify_sessions", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("notify_each_activity", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("notify_digest", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("users", "notify_digest")
    op.drop_column("users", "notify_each_activity")
    op.drop_column("users", "notify_sessions")
