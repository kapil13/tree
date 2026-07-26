"""Add is_active flag to organizations for platform suspend."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0025_org_is_active"
down_revision = "0024_org_team_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("organizations", "is_active")
