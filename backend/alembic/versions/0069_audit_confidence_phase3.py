"""Estate Watch Phase 3 — plantation confidence map."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0069_audit_confidence_phase3"
down_revision = "0068_audit_satellite_phase2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_confidence_assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "boundary_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("boundary_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("confidence_grade", sa.String(16), nullable=False, server_default="grey"),
        sa.Column("confidence_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ESTIMATION"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("grid_cells", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="audit_confidence_assessments_boundary_uq",
        ),
    )
    op.create_index(
        "audit_confidence_assessments_engagement_idx",
        "audit_confidence_assessments",
        ["engagement_id"],
    )
    op.create_index(
        "audit_confidence_assessments_grade_idx",
        "audit_confidence_assessments",
        ["confidence_grade"],
    )


def downgrade() -> None:
    op.drop_index("audit_confidence_assessments_grade_idx", table_name="audit_confidence_assessments")
    op.drop_index(
        "audit_confidence_assessments_engagement_idx", table_name="audit_confidence_assessments"
    )
    op.drop_table("audit_confidence_assessments")
