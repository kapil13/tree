"""Estate Watch Wave B: versioned plans, visit lifecycle, reconciliation, evidence graph."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0083_audit_wave_b_ground_truth"
down_revision = "0082_audit_wave_a_scope"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # P2 — versioned sampling plans
    op.add_column(
        "audit_sampling_plans",
        sa.Column("plan_version", sa.Integer(), nullable=True, server_default="1"),
    )
    op.add_column(
        "audit_sampling_plans",
        sa.Column(
            "parent_plan_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "audit_sampling_plans",
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE audit_sampling_plans SET plan_version = 1 WHERE plan_version IS NULL")
    op.alter_column("audit_sampling_plans", "plan_version", nullable=False)

    op.drop_constraint("audit_sampling_plans_cycle_uq", "audit_sampling_plans", type_="unique")
    op.create_unique_constraint(
        "audit_sampling_plans_cycle_version_uq",
        "audit_sampling_plans",
        ["cycle_id", "plan_version"],
    )
    op.create_foreign_key(
        "audit_sampling_plans_parent_plan_id_fkey",
        "audit_sampling_plans",
        "audit_sampling_plans",
        ["parent_plan_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "audit_sampling_plans_cycle_active_idx",
        "audit_sampling_plans",
        ["cycle_id", "status"],
    )

    # P3 — field visit lifecycle + integrity + idempotency
    op.add_column(
        "audit_field_visits",
        sa.Column("status", sa.String(32), nullable=True, server_default="accepted"),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("idempotency_key", sa.String(128), nullable=True),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("gps_integrity_passed", sa.Boolean(), nullable=True, server_default=sa.text("true")),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("photo_integrity_passed", sa.Boolean(), nullable=True, server_default=sa.text("true")),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE audit_field_visits SET status = 'accepted' WHERE status IS NULL")
    op.execute(
        "UPDATE audit_field_visits SET submitted_at = visited_at WHERE submitted_at IS NULL"
    )
    op.alter_column("audit_field_visits", "status", nullable=False)
    op.alter_column("audit_field_visits", "gps_integrity_passed", nullable=False)
    op.alter_column("audit_field_visits", "photo_integrity_passed", nullable=False)
    op.create_index(
        "audit_field_visits_idempotency_idx",
        "audit_field_visits",
        ["plot_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )

    # P6 — persisted reconciliation
    op.create_table(
        "audit_reconciliation_runs",
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
            "audit_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("aligned_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mismatch_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("no_field_data_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("block_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "audit_reconciliation_runs_cycle_idx",
        "audit_reconciliation_runs",
        ["cycle_id", "computed_at"],
    )

    op.create_table(
        "audit_reconciliation_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_reconciliation_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "boundary_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("boundary_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("confidence_grade", sa.String(16), nullable=True),
        sa.Column("confidence_score", sa.Integer(), nullable=True),
        sa.Column("field_grade", sa.String(16), nullable=True),
        sa.Column("field_signal", sa.String(32), nullable=True),
        sa.Column("visit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reconciliation", sa.String(32), nullable=False),
        sa.Column("aligned", sa.Boolean(), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.UniqueConstraint(
            "run_id",
            "boundary_version_id",
            name="audit_reconciliation_blocks_run_boundary_uq",
        ),
    )
    op.create_index(
        "audit_reconciliation_blocks_run_idx",
        "audit_reconciliation_blocks",
        ["run_id"],
    )

    # P10 — evidence graph
    op.create_table(
        "audit_evidence_nodes",
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
        sa.Column("node_type", sa.String(32), nullable=False),
        sa.Column("source_table", sa.String(64), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("epistemic_label", sa.String(16), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "cycle_id",
            "source_table",
            "source_id",
            name="audit_evidence_nodes_source_uq",
        ),
    )
    op.create_index(
        "audit_evidence_nodes_cycle_type_idx",
        "audit_evidence_nodes",
        ["cycle_id", "node_type"],
    )

    op.create_table(
        "audit_evidence_edges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cycle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "from_node_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_evidence_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_node_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_evidence_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("edge_type", sa.String(32), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint(
            "from_node_id",
            "to_node_id",
            "edge_type",
            name="audit_evidence_edges_from_to_type_uq",
        ),
    )
    op.create_index(
        "audit_evidence_edges_cycle_idx",
        "audit_evidence_edges",
        ["cycle_id"],
    )


def downgrade() -> None:
    raise NotImplementedError("Wave B downgrade is unsupported: it would break immutable audit history.")
