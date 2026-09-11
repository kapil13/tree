"""Estate Watch Phase 7 — auditor review and attestation."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0072_audit_attestation_phase7"
down_revision = "0071_audit_sampling_phase5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_reviewer_attestations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("verdict", sa.String(32), nullable=False, server_default="conditional"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("export_bundle_sha256", sa.String(64), nullable=True),
        sa.Column("attestation_hash", sa.String(64), nullable=True),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ATTESTATION"),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("engagement_id", name="audit_reviewer_attestations_engagement_uq"),
    )
    op.create_index(
        "audit_reviewer_attestations_engagement_idx",
        "audit_reviewer_attestations",
        ["engagement_id"],
    )

    op.create_table(
        "audit_anomaly_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "anomaly_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_anomaly_events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("disposition", sa.String(32), nullable=False),
        sa.Column("previous_status", sa.String(16), nullable=False),
        sa.Column("new_status", sa.String(16), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False, server_default=""),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ATTESTATION"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "audit_anomaly_reviews_engagement_idx",
        "audit_anomaly_reviews",
        ["engagement_id"],
    )
    op.create_index(
        "audit_anomaly_reviews_anomaly_idx",
        "audit_anomaly_reviews",
        ["anomaly_id", "reviewed_at"],
    )


def downgrade() -> None:
    op.drop_index("audit_anomaly_reviews_anomaly_idx", table_name="audit_anomaly_reviews")
    op.drop_index("audit_anomaly_reviews_engagement_idx", table_name="audit_anomaly_reviews")
    op.drop_table("audit_anomaly_reviews")
    op.drop_index(
        "audit_reviewer_attestations_engagement_idx",
        table_name="audit_reviewer_attestations",
    )
    op.drop_table("audit_reviewer_attestations")
