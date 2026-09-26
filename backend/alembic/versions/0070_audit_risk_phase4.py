"""Estate Watch Phase 4 — risk anomalies and auditor queue."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0070_audit_risk_phase4"
down_revision = "0069_audit_confidence_phase3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_anomaly_events",
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
        sa.Column("anomaly_type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="OBSERVATION"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            "anomaly_type",
            name="audit_anomaly_events_type_uq",
        ),
    )
    op.create_index("audit_anomaly_events_engagement_idx", "audit_anomaly_events", ["engagement_id"])
    op.create_index("audit_anomaly_events_severity_idx", "audit_anomaly_events", ["severity"])

    op.create_table(
        "audit_risk_assessments",
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
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(16), nullable=False, server_default="low"),
        sa.Column("priority_rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("anomaly_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recommended_action", sa.Text(), nullable=False, server_default=""),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ESTIMATION"),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="audit_risk_assessments_boundary_uq",
        ),
    )
    op.create_index("audit_risk_assessments_engagement_idx", "audit_risk_assessments", ["engagement_id"])
    op.create_index(
        "audit_risk_assessments_rank_idx",
        "audit_risk_assessments",
        ["engagement_id", "priority_rank"],
    )


def downgrade() -> None:
    op.drop_index("audit_risk_assessments_rank_idx", table_name="audit_risk_assessments")
    op.drop_index("audit_risk_assessments_engagement_idx", table_name="audit_risk_assessments")
    op.drop_table("audit_risk_assessments")
    op.drop_index("audit_anomaly_events_severity_idx", table_name="audit_anomaly_events")
    op.drop_index("audit_anomaly_events_engagement_idx", table_name="audit_anomaly_events")
    op.drop_table("audit_anomaly_events")
