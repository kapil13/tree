"""Add server defaults for credit ledger timestamp columns."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0016_credit_ledger_timestamps"
down_revision = "0015_credit_ledger"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "project_credit_ledgers",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        existing_nullable=False,
    )
    op.alter_column(
        "project_credit_ledgers",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        existing_nullable=False,
    )
    op.alter_column(
        "credit_ledger_events",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "credit_ledger_events",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        existing_nullable=False,
    )
    op.alter_column(
        "project_credit_ledgers",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        existing_nullable=False,
    )
    op.alter_column(
        "project_credit_ledgers",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        existing_nullable=False,
    )
