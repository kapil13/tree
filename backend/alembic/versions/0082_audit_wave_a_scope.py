"""Estate Watch Wave A: cycle-scoped evidence, methodology registry, export entities."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0082_audit_wave_a_scope"
down_revision = "0081_audit_p1_finality"
branch_labels = None
depends_on = None

_EVIDENCE_TABLES = (
    "audit_satellite_baselines",
    "audit_temporal_observations",
    "audit_confidence_assessments",
    "audit_anomaly_events",
    "audit_risk_assessments",
    "audit_anomaly_reviews",
    "audit_sampling_plans",
    "audit_field_plots",
    "audit_field_visits",
)

_BACKFILL_SQL = """
UPDATE {table} t
SET cycle_id = c.id
FROM audit_cycles c
WHERE t.cycle_id IS NULL
  AND c.engagement_id = t.engagement_id
  AND c.cycle_number = (
      SELECT MIN(c2.cycle_number)
      FROM audit_cycles c2
      WHERE c2.engagement_id = t.engagement_id
  )
"""

_VISIT_BACKFILL_SQL = """
UPDATE audit_field_visits v
SET cycle_id = p.cycle_id
FROM audit_field_plots p
WHERE v.cycle_id IS NULL
  AND v.plot_id = p.id
"""


def upgrade() -> None:
    op.create_table(
        "audit_methodologies",
        sa.Column("version", sa.String(128), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "audit_rule_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "methodology_version",
            sa.String(128),
            sa.ForeignKey("audit_methodologies.version", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("rule_code", sa.String(64), nullable=False),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("parameters", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "methodology_version",
            "rule_code",
            name="audit_rule_versions_methodology_rule_uq",
        ),
    )
    op.create_index(
        "audit_rule_versions_methodology_idx",
        "audit_rule_versions",
        ["methodology_version"],
    )
    op.create_table(
        "audit_threshold_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "methodology_version",
            sa.String(128),
            sa.ForeignKey("audit_methodologies.version", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("thresholds", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "methodology_version",
            "name",
            name="audit_threshold_sets_methodology_name_uq",
        ),
    )
    op.create_index(
        "audit_threshold_sets_methodology_idx",
        "audit_threshold_sets",
        ["methodology_version"],
    )

    op.execute("""
        INSERT INTO audit_methodologies (version, name, description, status, effective_from)
        VALUES (
            'estate-watch-1.0.0',
            'Estate Watch Audit Methodology',
            'Deterministic satellite observation, statistical field sampling, and confidence fusion.',
            'active',
            now()
        )
        ON CONFLICT (version) DO NOTHING
    """)
    op.execute("""
        UPDATE audit_cycles
        SET methodology_version = 'estate-watch-1.0.0'
        WHERE methodology_version IS NULL
    """)

    for table in _EVIDENCE_TABLES:
        if table == "audit_field_visits":
            op.add_column(
                table,
                sa.Column("cycle_id", postgresql.UUID(as_uuid=True), nullable=True),
            )
            continue
        op.add_column(
            table,
            sa.Column("cycle_id", postgresql.UUID(as_uuid=True), nullable=True),
        )

    for table in _EVIDENCE_TABLES:
        if table == "audit_field_visits":
            op.execute(_VISIT_BACKFILL_SQL)
        else:
            op.execute(_BACKFILL_SQL.format(table=table))

    op.drop_constraint("audit_satellite_baselines_boundary_uq", "audit_satellite_baselines", type_="unique")
    op.drop_constraint(
        "audit_temporal_observations_phase_uq", "audit_temporal_observations", type_="unique"
    )
    op.drop_constraint(
        "audit_confidence_assessments_boundary_uq", "audit_confidence_assessments", type_="unique"
    )
    op.drop_constraint("audit_anomaly_events_type_uq", "audit_anomaly_events", type_="unique")
    op.drop_constraint("audit_risk_assessments_boundary_uq", "audit_risk_assessments", type_="unique")
    op.drop_constraint("audit_sampling_plans_engagement_uq", "audit_sampling_plans", type_="unique")

    for table in _EVIDENCE_TABLES:
        op.create_foreign_key(
            f"{table}_cycle_id_fkey",
            table,
            "audit_cycles",
            ["cycle_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        op.alter_column(table, "cycle_id", nullable=False)

    op.create_unique_constraint(
        "audit_satellite_baselines_boundary_uq",
        "audit_satellite_baselines",
        ["cycle_id", "boundary_version_id"],
    )
    op.create_unique_constraint(
        "audit_temporal_observations_phase_uq",
        "audit_temporal_observations",
        ["cycle_id", "boundary_version_id", "phase"],
    )
    op.create_unique_constraint(
        "audit_confidence_assessments_boundary_uq",
        "audit_confidence_assessments",
        ["cycle_id", "boundary_version_id"],
    )
    op.create_unique_constraint(
        "audit_anomaly_events_type_uq",
        "audit_anomaly_events",
        ["cycle_id", "boundary_version_id", "anomaly_type"],
    )
    op.create_unique_constraint(
        "audit_risk_assessments_boundary_uq",
        "audit_risk_assessments",
        ["cycle_id", "boundary_version_id"],
    )
    op.create_unique_constraint(
        "audit_sampling_plans_cycle_uq",
        "audit_sampling_plans",
        ["cycle_id"],
    )

    for table in _EVIDENCE_TABLES:
        op.create_index(f"{table}_cycle_idx", table, ["cycle_id"])

    op.drop_index("audit_risk_assessments_rank_idx", table_name="audit_risk_assessments")
    op.create_index(
        "audit_risk_assessments_rank_idx",
        "audit_risk_assessments",
        ["cycle_id", "priority_rank"],
    )

    op.create_table(
        "audit_exports",
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
        sa.Column("status", sa.String(32), nullable=False, server_default="generated"),
        sa.Column("export_version", sa.String(64), nullable=False),
        sa.Column("methodology_version", sa.String(128), nullable=True),
        sa.Column("content_manifest_hash", sa.String(64), nullable=False),
        sa.Column("unsigned_bundle_hash", sa.String(64), nullable=False),
        sa.Column("package_sha256", sa.String(64), nullable=False),
        sa.Column("file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("zip_size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("signature_key_id", sa.String(64), nullable=True),
        sa.Column("manifest_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "superseded_by_export_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_exports.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("audit_exports_cycle_idx", "audit_exports", ["cycle_id", "generated_at"])
    op.create_index("audit_exports_engagement_idx", "audit_exports", ["engagement_id"])
    op.create_index("audit_exports_package_sha256_idx", "audit_exports", ["package_sha256"])

    op.create_table(
        "audit_export_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "export_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_exports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("path", sa.String(512), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("audit_export_files_export_idx", "audit_export_files", ["export_id"])


def downgrade() -> None:
    raise NotImplementedError("Wave A downgrade is unsupported: it would break immutable audit history.")
