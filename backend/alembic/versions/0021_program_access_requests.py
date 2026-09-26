"""Program access requests for premium planting programs."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0021_program_access_requests"
down_revision = "0020_user_verification_timestamps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "program_access_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("program_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["program_id"], ["planting_programs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "program_id",
            name="program_access_requests_user_program_uq",
        ),
    )
    op.create_index(
        "program_access_requests_status_idx",
        "program_access_requests",
        ["status"],
    )
    op.create_index(
        "program_access_requests_user_idx",
        "program_access_requests",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("program_access_requests_user_idx", table_name="program_access_requests")
    op.drop_index("program_access_requests_status_idx", table_name="program_access_requests")
    op.drop_table("program_access_requests")
