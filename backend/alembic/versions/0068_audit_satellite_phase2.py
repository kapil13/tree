"""Estate Watch Phase 2 — satellite baselines and temporal timeline."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0068_audit_satellite_phase2"
down_revision = "0067_audit_engagement_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_satellite_baselines",
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
        sa.Column("planting_date", sa.Date(), nullable=True),
        sa.Column("t0_scene_acquired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("t0_scene_id", sa.String(255), nullable=True),
        sa.Column("t0_provider", sa.String(64), nullable=True),
        sa.Column("t0_ndvi_mean", sa.Numeric(6, 4), nullable=True),
        sa.Column("t0_evi_mean", sa.Numeric(6, 4), nullable=True),
        sa.Column("t0_indices", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="OBSERVATION"),
        sa.Column("backfill_status", sa.String(32), nullable=False, server_default="pending"),
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
        sa.UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="audit_satellite_baselines_boundary_uq",
        ),
    )
    op.create_index(
        "audit_satellite_baselines_engagement_idx",
        "audit_satellite_baselines",
        ["engagement_id"],
    )

    op.create_table(
        "audit_temporal_observations",
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
        sa.Column("phase", sa.String(16), nullable=False),
        sa.Column("scene_acquired_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scene_id", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(64), nullable=False),
        sa.Column("ndvi_mean", sa.Numeric(6, 4), nullable=True),
        sa.Column("evi_mean", sa.Numeric(6, 4), nullable=True),
        sa.Column("change_vs_t0", sa.Numeric(6, 4), nullable=True),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="OBSERVATION"),
        sa.Column("indices", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            "phase",
            name="audit_temporal_observations_phase_uq",
        ),
    )
    op.create_index(
        "audit_temporal_observations_engagement_idx",
        "audit_temporal_observations",
        ["engagement_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "audit_temporal_observations_engagement_idx", table_name="audit_temporal_observations"
    )
    op.drop_table("audit_temporal_observations")
    op.drop_index("audit_satellite_baselines_engagement_idx", table_name="audit_satellite_baselines")
    op.drop_table("audit_satellite_baselines")
