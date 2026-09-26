"""add is_active to users

Revision ID: 5583641f53e9
Revises: 8edfa4d0225a
Create Date: 2026-09-22

"""
from alembic import op
import sqlalchemy as sa

revision = "5583641f53e9"
down_revision = "8edfa4d0225a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_active")
