"""Phase 0: tree integrity risk scores, verification status, satellite indices."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0061_phase0_integrity_satellite"
down_revision = "0060_india_admin_geography"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trees",
        sa.Column(
            "verification_status",
            sa.String(length=32),
            nullable=False,
            server_default="registered",
        ),
    )
    op.create_index("trees_verification_status_idx", "trees", ["verification_status"])

    op.create_table(
        "tree_risk_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("gps_photo_match", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("duplicate_photo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "duplicate_coordinate", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "ai_confidence_low", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "regeotag_mismatch", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("composite_risk", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tree_id"),
    )
    op.create_index("tree_risk_scores_tree_idx", "tree_risk_scores", ["tree_id"])

    op.add_column(
        "plantation_satellite_records",
        sa.Column("indices", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("plantation_satellite_records", "indices")
    op.drop_index("tree_risk_scores_tree_idx", table_name="tree_risk_scores")
    op.drop_table("tree_risk_scores")
    op.drop_index("trees_verification_status_idx", table_name="trees")
    op.drop_column("trees", "verification_status")
