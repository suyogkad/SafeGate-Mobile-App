"""emergency contact and home address become optional

The parent setup flow never asks for these, so they were being filled with the
placeholder "Not provided". A placeholder in an emergency contact field looks
like real data to whoever reads it in a hurry, and nothing flags it as missing.
Absent is now recorded as absent.

Revision ID: e8a3b1c45d26
Revises: d5f1c7a92e40
Create Date: 2026-10-06

"""
from alembic import op
import sqlalchemy as sa

revision = "e8a3b1c45d26"
down_revision = "d5f1c7a92e40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("children", "emergency_contact_name", existing_type=sa.String(255), nullable=True)
    op.alter_column("children", "emergency_contact_phone", existing_type=sa.String(50), nullable=True)
    op.alter_column("children", "home_address", existing_type=sa.Text(), nullable=True)

    # Clear the exact placeholder the old code wrote, so those records show as
    # incomplete rather than as a contact someone might try to use. Only this
    # exact string -- a name like "Parent" could be genuine, so it is left alone.
    op.execute("UPDATE children SET emergency_contact_phone = NULL WHERE emergency_contact_phone = 'Not provided'")
    op.execute("UPDATE children SET home_address = NULL WHERE home_address = 'Not provided'")


def downgrade() -> None:
    # Re-tightening needs a value in every row; callers must backfill first.
    op.alter_column("children", "home_address", existing_type=sa.Text(), nullable=False)
    op.alter_column("children", "emergency_contact_phone", existing_type=sa.String(50), nullable=False)
    op.alter_column("children", "emergency_contact_name", existing_type=sa.String(255), nullable=False)
