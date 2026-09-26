"""child devices and link codes, and device-attributed access logs

Revision ID: d5f1c7a92e40
Revises: c3e9a5b41d70
Create Date: 2026-09-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d5f1c7a92e40"
down_revision = "c3e9a5b41d70"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "child_devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False, index=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("label", sa.String(100), nullable=True),
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "child_link_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id"), nullable=False, index=True),
        sa.Column("code", sa.String(12), nullable=False, index=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # A child's own device can now be the actor in the audit trail.
    op.alter_column("child_access_logs", "accessed_by_user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.add_column(
        "child_access_logs",
        sa.Column("accessed_by_device_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_devices.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("child_access_logs", "accessed_by_device_id")
    op.alter_column("child_access_logs", "accessed_by_user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.drop_table("child_link_codes")
    op.drop_table("child_devices")
