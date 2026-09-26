"""Estate Watch audit intake — engagement, claim snapshot, boundaries (Phase 1)."""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0067_audit_engagement_phase1"
down_revision = "0066_monitoring_scan_targets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_engagements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("intake_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
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
        sa.UniqueConstraint("project_id", name="audit_engagements_project_uq"),
    )
    op.create_index("audit_engagements_org_idx", "audit_engagements", ["organization_id"])
    op.create_index("audit_engagements_status_idx", "audit_engagements", ["status"])

    op.create_table(
        "claim_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("claim_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="CLAIM"),
        sa.Column("frozen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "engagement_id", "version", name="claim_snapshots_engagement_version_uq"
        ),
    )
    op.create_index("claim_snapshots_engagement_idx", "claim_snapshots", ["engagement_id"])

    op.create_table(
        "claim_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("doc_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "uploaded_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    )
    op.create_index("claim_documents_engagement_idx", "claim_documents", ["engagement_id"])
    op.create_index("claim_documents_type_idx", "claim_documents", ["doc_type"])

    op.create_table(
        "boundary_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source", sa.String(32), nullable=False, server_default="claim_import"),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("block_type", sa.String(64), nullable=True),
        sa.Column("boundary", Geography(geometry_type="POLYGON", srid=4326), nullable=False),
        sa.Column("area_ha_claimed", sa.Numeric(12, 4), nullable=True),
        sa.Column("area_ha_measured", sa.Numeric(12, 4), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
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
    )
    op.create_index("boundary_versions_engagement_idx", "boundary_versions", ["engagement_id"])
    op.execute(
        "CREATE INDEX boundary_versions_boundary_gix ON boundary_versions USING gist (boundary)"
    )

    op.create_table(
        "plantability_exclusions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("exclusion_type", sa.String(32), nullable=False, server_default="other"),
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
        sa.Column("boundary", Geography(geometry_type="POLYGON", srid=4326), nullable=False),
        sa.Column("area_ha", sa.Numeric(12, 4), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
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
    )
    op.create_index(
        "plantability_exclusions_engagement_idx", "plantability_exclusions", ["engagement_id"]
    )
    op.execute(
        "CREATE INDEX plantability_exclusions_boundary_gix "
        "ON plantability_exclusions USING gist (boundary)"
    )

    op.create_table(
        "plausibility_assessments",
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
        sa.Column("verdict", sa.String(32), nullable=False, server_default="cannot_assess"),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ESTIMATION"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("signals", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="plausibility_assessments_boundary_uq",
        ),
    )
    op.create_index(
        "plausibility_assessments_engagement_idx", "plausibility_assessments", ["engagement_id"]
    )

    op.create_table(
        "gis_validation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(16), nullable=False, server_default="pass"),
        sa.Column("checks", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("issues", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("gis_validation_runs_engagement_idx", "gis_validation_runs", ["engagement_id"])


def downgrade() -> None:
    op.drop_index("gis_validation_runs_engagement_idx", table_name="gis_validation_runs")
    op.drop_table("gis_validation_runs")
    op.drop_index("plausibility_assessments_engagement_idx", table_name="plausibility_assessments")
    op.drop_table("plausibility_assessments")
    op.execute("DROP INDEX IF EXISTS plantability_exclusions_boundary_gix")
    op.drop_index("plantability_exclusions_engagement_idx", table_name="plantability_exclusions")
    op.drop_table("plantability_exclusions")
    op.execute("DROP INDEX IF EXISTS boundary_versions_boundary_gix")
    op.drop_index("boundary_versions_engagement_idx", table_name="boundary_versions")
    op.drop_table("boundary_versions")
    op.drop_index("claim_documents_type_idx", table_name="claim_documents")
    op.drop_index("claim_documents_engagement_idx", table_name="claim_documents")
    op.drop_table("claim_documents")
    op.drop_index("claim_snapshots_engagement_idx", table_name="claim_snapshots")
    op.drop_table("claim_snapshots")
    op.drop_index("audit_engagements_status_idx", table_name="audit_engagements")
    op.drop_index("audit_engagements_org_idx", table_name="audit_engagements")
    op.drop_table("audit_engagements")
