"""session notes in two parts: what the family sees, and the therapist's own

Revision ID: b7e4a1d93c06
Revises: a92f3c5e71b4
Create Date: 2026-10-08

The table existed from Stage 1 with a single note_text and no endpoints, so it
held no rows; it is reshaped rather than migrated.
"""
from alembic import op
import sqlalchemy as sa

revision = "b7e4a1d93c06"
down_revision = "a92f3c5e71b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("session_notes", "note_text")
    op.add_column("session_notes", sa.Column("highlights", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("session_notes", sa.Column("shared", sa.Text(), nullable=False, server_default=""))
    op.add_column("session_notes", sa.Column("try_at_home", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("session_notes", sa.Column("working", sa.Text(), nullable=False, server_default=""))
    op.add_column("session_notes", sa.Column("shared_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "session_notes",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # One set of notes per session.
    op.create_unique_constraint("uq_session_notes_session_id", "session_notes", ["session_id"])


def downgrade() -> None:
    op.drop_constraint("uq_session_notes_session_id", "session_notes", type_="unique")
    for col in ("updated_at", "shared_at", "working", "try_at_home", "shared", "highlights"):
        op.drop_column("session_notes", col)
    op.add_column("session_notes", sa.Column("note_text", sa.Text(), nullable=False, server_default=""))
