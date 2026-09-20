"""Estate Watch Wave D: export artifacts, verification, methodology depth."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0085_audit_wave_d_export_methodology"
down_revision = "0084_audit_wave_c_portfolio"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_exports",
        sa.Column("signature_json", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "audit_exports",
        sa.Column("frozen_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "audit_export_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "export_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_exports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("zip_bytes", sa.LargeBinary(), nullable=False),
        sa.Column("stored_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("export_id", name="audit_export_artifacts_export_uq"),
    )

    op.create_table(
        "audit_export_verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "export_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_exports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("valid", sa.Boolean(), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "verified_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("details", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "audit_export_verifications_export_idx",
        "audit_export_verifications",
        ["export_id", "verified_at"],
    )

    op.add_column(
        "audit_verification_snapshots",
        sa.Column(
            "export_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_exports.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "audit_verification_snapshots_export_idx",
        "audit_verification_snapshots",
        ["export_id"],
    )

    op.create_table(
        "audit_engagement_methodology_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "methodology_version",
            sa.String(128),
            sa.ForeignKey("audit_methodologies.version", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("threshold_overrides", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("engagement_id", name="audit_engagement_methodology_overrides_engagement_uq"),
    )

    op.create_table(
        "audit_methodology_change_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_version", sa.String(128), nullable=True),
        sa.Column("to_version", sa.String(128), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "changed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "audit_methodology_change_log_engagement_idx",
        "audit_methodology_change_log",
        ["engagement_id", "changed_at"],
    )

    op.execute("""
        INSERT INTO audit_rule_versions (id, methodology_version, rule_code, version, parameters, created_at, updated_at)
        VALUES
            (gen_random_uuid(), 'estate-watch-1.0.0', 'confidence_fusion', '1.0.0',
             '{"grades": ["green", "amber", "red", "grey"]}'::jsonb, now(), now()),
            (gen_random_uuid(), 'estate-watch-1.0.0', 'risk_scan', '1.0.0',
             '{"severity_order": ["critical", "high", "medium", "low"]}'::jsonb, now(), now()),
            (gen_random_uuid(), 'estate-watch-1.0.0', 'sampling_stratification', '1.0.0',
             '{"default_mode": "risk_weighted"}'::jsonb, now(), now())
        ON CONFLICT ON CONSTRAINT audit_rule_versions_methodology_rule_uq DO NOTHING
    """)

    op.execute("""
        INSERT INTO audit_threshold_sets (id, methodology_version, name, thresholds, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'estate-watch-1.0.0',
            'default',
            '{"ndvi_acute_drop": -0.15, "confidence_low_score": 40, "min_plots_per_block": 1}'::jsonb,
            now(),
            now()
        )
        ON CONFLICT ON CONSTRAINT audit_threshold_sets_methodology_name_uq DO NOTHING
    """)


def downgrade() -> None:
    raise NotImplementedError("Wave D downgrade is unsupported: it would break immutable audit history.")
