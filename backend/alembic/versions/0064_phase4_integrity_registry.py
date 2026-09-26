"""Phase 4: integrity snapshots on registry serials and claim fusion scores."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0064_phase4_integrity_registry"
down_revision = "0063_phase2_integrity_fusion"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "credit_serials",
        sa.Column("integrity_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "claim_registry",
        sa.Column("fusion_score", sa.Numeric(5, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("claim_registry", "fusion_score")
    op.drop_column("credit_serials", "integrity_snapshot")
