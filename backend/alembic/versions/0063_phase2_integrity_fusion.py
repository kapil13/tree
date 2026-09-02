"""Phase 2: integrity fusion scores on tree_risk_scores."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0063_phase2_integrity_fusion"
down_revision = "0062_phase1_photo_integrity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tree_risk_scores",
        sa.Column("field_score", sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        "tree_risk_scores",
        sa.Column("satellite_score", sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        "tree_risk_scores",
        sa.Column("fusion_score", sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        "tree_risk_scores",
        sa.Column(
            "credit_eligible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "tree_risk_scores",
        sa.Column("fusion_details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index(
        "tree_risk_scores_credit_eligible_idx",
        "tree_risk_scores",
        ["credit_eligible"],
    )


def downgrade() -> None:
    op.drop_index("tree_risk_scores_credit_eligible_idx", table_name="tree_risk_scores")
    op.drop_column("tree_risk_scores", "fusion_details")
    op.drop_column("tree_risk_scores", "credit_eligible")
    op.drop_column("tree_risk_scores", "fusion_score")
    op.drop_column("tree_risk_scores", "satellite_score")
    op.drop_column("tree_risk_scores", "field_score")
