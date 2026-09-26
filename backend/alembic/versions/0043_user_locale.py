"""Add user locale preference for web/mobile sync.

Revision ID: 0043_user_locale
Revises: 0042_registry_credit_ledger
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0043_user_locale"
down_revision = "0042_registry_credit_ledger"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("locale", sa.String(16), nullable=False, server_default="en"),
    )


def downgrade() -> None:
    op.drop_column("users", "locale")
