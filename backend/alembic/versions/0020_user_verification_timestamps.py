"""Add phone and email verification timestamps on users."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0020_user_verification_timestamps"
down_revision = "0019_cms_site_content"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "phone_verified_at")
