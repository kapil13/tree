"""Estate Watch Wave C: portfolio rollups, benchmarks, patterns, digests, workspace."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0084_audit_wave_c_portfolio"
down_revision = "0083_audit_wave_b_ground_truth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_portfolio_cycle_rollups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cycle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("engagement_status", sa.String(32), nullable=False),
        sa.Column("cycle_status", sa.String(32), nullable=False),
        sa.Column("cycle_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("grade_counts", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("risk_level_counts", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("open_anomaly_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("critical_anomaly_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("plots_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("plots_visited", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("plots_due", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reconciliation_aligned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reconciliation_mismatch", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reconciliation_no_field", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("cycle_id", name="audit_portfolio_cycle_rollups_cycle_uq"),
    )
    op.create_index(
        "audit_portfolio_cycle_rollups_org_idx",
        "audit_portfolio_cycle_rollups",
        ["organization_id", "computed_at"],
    )
    op.create_index(
        "audit_portfolio_cycle_rollups_project_idx",
        "audit_portfolio_cycle_rollups",
        ["project_id"],
    )

    op.create_table(
        "audit_benchmark_baselines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("metric_code", sa.String(64), nullable=False),
        sa.Column("metric_value", sa.Numeric(12, 4), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "scope",
            "organization_id",
            "metric_code",
            name="audit_benchmark_baselines_scope_metric_uq",
        ),
    )
    op.create_index(
        "audit_benchmark_baselines_org_idx",
        "audit_benchmark_baselines",
        ["organization_id", "metric_code"],
    )

    op.create_table(
        "audit_cross_estate_patterns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("pattern_type", sa.String(64), nullable=False),
        sa.Column("anomaly_type", sa.String(64), nullable=True),
        sa.Column("engagement_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("affected_engagement_ids", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("severity_peak", sa.String(16), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "organization_id",
            "pattern_type",
            "anomaly_type",
            name="audit_cross_estate_patterns_org_type_uq",
        ),
    )
    op.create_index(
        "audit_cross_estate_patterns_org_idx",
        "audit_cross_estate_patterns",
        ["organization_id", "detected_at"],
    )

    op.create_table(
        "audit_report_templates",
        sa.Column("code", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version", sa.String(32), nullable=False, server_default="1.0.0"),
        sa.Column("sections", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "audit_digest_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "template_code",
            sa.String(64),
            sa.ForeignKey("audit_report_templates.code", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("cadence", sa.String(16), nullable=False, server_default="weekly"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "organization_id",
            "template_code",
            name="audit_digest_schedules_org_template_uq",
        ),
    )

    op.create_table(
        "audit_digest_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "schedule_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_digest_schedules.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("template_code", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="generated"),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "audit_digest_runs_org_idx",
        "audit_digest_runs",
        ["organization_id", "generated_at"],
    )

    op.create_table(
        "audit_auditor_workspace_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("filters", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "name", name="audit_auditor_workspace_views_user_name_uq"),
    )

    op.execute("""
        INSERT INTO audit_report_templates (code, name, version, sections, status)
        VALUES (
            'estate-watch-portfolio-weekly',
            'Estate Watch Portfolio Weekly Digest',
            '1.0.0',
            '["portfolio_summary", "field_queue", "reconciliation_gaps", "anomaly_patterns"]'::jsonb,
            'active'
        ),
        (
            'estate-watch-auditor-daily',
            'Estate Watch Auditor Daily Workspace',
            '1.0.0',
            '["field_queue", "critical_anomalies", "mismatch_blocks"]'::jsonb,
            'active'
        )
        ON CONFLICT (code) DO NOTHING
    """)


def downgrade() -> None:
    raise NotImplementedError("Wave C downgrade is unsupported: it would break immutable audit history.")
