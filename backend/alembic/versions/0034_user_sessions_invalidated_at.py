"""User sessions_invalidated_at for admin session revocation."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0034_user_sessions_invalidated_at"
down_revision = "0033_platform_user_module_grants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("sessions_invalidated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "sessions_invalidated_at")
