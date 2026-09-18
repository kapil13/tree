"""Estate Watch P0 audit kernel: immutable cycles and computation provenance."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0077_audit_kernel_cycles_runs"
down_revision = "0076_audit_phase9_sprint5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_cycles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("engagement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("cycle_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("closed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("parent_cycle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("trigger_reason", sa.Text(), nullable=True),
        sa.Column("trigger_source", sa.String(64), nullable=True),
        sa.Column("methodology_version", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("engagement_id", "cycle_number", name="audit_cycles_engagement_number_uq"),
        sa.CheckConstraint("status IN ('draft', 'analysis_ready', 'risk_assessed', 'sampling_planned', 'field_verification', 'export_ready', 'under_review', 'attested', 'superseded', 'cancelled')", name="audit_cycles_status_ck"),
    )
    op.create_index("audit_cycles_engagement_idx", "audit_cycles", ["engagement_id"])
    op.create_index("audit_cycles_engagement_status_idx", "audit_cycles", ["engagement_id", "status"])
    op.create_index("audit_cycles_one_open_per_engagement_uq", "audit_cycles", ["engagement_id"], unique=True, postgresql_where=sa.text("status NOT IN ('attested', 'superseded', 'cancelled')"))
    # One deterministic foundation cycle preserves existing engagements without
    # inferring historical evidence or reconstructing metadata-only prior cycles.
    op.execute("""
        INSERT INTO audit_cycles (id, engagement_id, cycle_number, status, opened_at, closed_at,
                                  started_by_user_id, methodology_version, created_at, updated_at)
        SELECT gen_random_uuid(), id, 1,
               CASE status
                   WHEN 'attested' THEN 'attested'
                   WHEN 'under_review' THEN 'under_review'
                   WHEN 'export_ready' THEN 'export_ready'
                   WHEN 'field_verified' THEN 'field_verification'
                   WHEN 'sampling_planned' THEN 'sampling_planned'
                   WHEN 'risk_assessed' THEN 'risk_assessed'
                   WHEN 'cancelled' THEN 'cancelled'
                   WHEN 'draft' THEN 'draft'
                   ELSE 'analysis_ready'
               END,
               created_at,
               CASE WHEN status IN ('attested', 'cancelled') THEN updated_at ELSE NULL END,
               created_by_user_id, NULL, created_at, updated_at
        FROM audit_engagements
    """)

    op.create_table(
        "audit_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cycle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("run_type", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("methodology_version", sa.String(128), nullable=True),
        sa.Column("application_version", sa.String(128), nullable=True),
        sa.Column("algorithm_version", sa.String(128), nullable=True),
        sa.Column("parameters", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("input_manifest_hash", sa.String(64), nullable=True),
        sa.Column("output_manifest_hash", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("run_type IN ('gis', 'satellite_baseline', 'satellite_temporal', 'confidence', 'risk', 'sampling', 'field_reconciliation', 'integrity', 'export')", name="audit_runs_type_ck"),
        sa.CheckConstraint("status IN ('running', 'completed', 'failed')", name="audit_runs_status_ck"),
    )
    op.create_index("audit_runs_cycle_idx", "audit_runs", ["cycle_id", "created_at"])
    op.create_index("audit_runs_cycle_type_idx", "audit_runs", ["cycle_id", "run_type"])


def downgrade() -> None:
    raise NotImplementedError(
        "Audit kernel downgrade is intentionally unsupported: it would delete immutable audit history."
    )
