"""Separate a parent having seen an alert from an admin clearing their inbox

Revision ID: b4e82f0d7a16
Revises: a7d3e9b15c42
Create Date: 2026-10-13

The child's calm screen says "Someone who looks after you has seen this". That was
driven by `acknowledged_at`, which an admin also sets from the ops alerts inbox --
so an admin clearing their queue made the child's app claim a grown-up who looks
after them had seen it. An admin is not that person.

`seen_by_parent_at` is set only by the child's own parent, and only it drives what
the child is told and what the therapist is shown about the family. `acknowledged_at`
stays as the admin's own "dealt with" marker.

Existing rows: an acknowledgement is carried over only where the person who made it
is the child's own parent. An admin's is deliberately left behind rather than
assumed, because the whole point is not to overstate who has seen it.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b4e82f0d7a16"
down_revision = "a7d3e9b15c42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("seen_by_parent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "alerts",
        sa.Column("seen_by_parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.execute(
        """
        UPDATE alerts a
           SET seen_by_parent_at = a.acknowledged_at,
               seen_by_parent_id  = a.acknowledged_by
          FROM children c, users u
         WHERE c.id = a.child_id
           AND u.id = a.acknowledged_by
           AND u.id = c.parent_id
           AND a.acknowledged_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_column("alerts", "seen_by_parent_id")
    op.drop_column("alerts", "seen_by_parent_at")
