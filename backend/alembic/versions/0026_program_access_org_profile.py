"""Add org_profile JSONB to program access requests."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0026_program_access_org_profile"
down_revision = "0025_org_is_active"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "program_access_requests",
        sa.Column("org_profile", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("program_access_requests", "org_profile")
