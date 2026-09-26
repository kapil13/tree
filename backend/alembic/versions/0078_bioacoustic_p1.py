"""Bioacoustic P1 — expert review, monitoring periods, audit bundle support."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0078_bioacoustic_p1"
down_revision = "0077_bioacoustic_p0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bioacoustic_monitoring_periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(128), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("season_class", sa.String(32), nullable=False, server_default="unspecified"),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "bioacoustic_monitoring_period_fence_idx",
        "bioacoustic_monitoring_periods",
        ["fence_id", "period_start"],
    )

    op.add_column(
        "bioacoustic_recordings",
        sa.Column(
            "monitoring_period_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "bioacoustic_recording_monitoring_period_fk",
        "bioacoustic_recordings",
        "bioacoustic_monitoring_periods",
        ["monitoring_period_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "bioacoustic_detection_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "recording_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bioacoustic_recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "analysis_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bioacoustic_analysis_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("scientific_name", sa.String(255), nullable=False),
        sa.Column(
            "reviewer_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint(
            "recording_id",
            "scientific_name",
            "analysis_run_id",
            name="bioacoustic_detection_review_uq",
        ),
    )
    op.create_index(
        "bioacoustic_detection_review_recording_idx",
        "bioacoustic_detection_reviews",
        ["recording_id", "reviewed_at"],
    )


def downgrade() -> None:
    op.drop_index("bioacoustic_detection_review_recording_idx", table_name="bioacoustic_detection_reviews")
    op.drop_table("bioacoustic_detection_reviews")
    op.drop_constraint("bioacoustic_recording_monitoring_period_fk", "bioacoustic_recordings", type_="foreignkey")
    op.drop_column("bioacoustic_recordings", "monitoring_period_id")
    op.drop_index("bioacoustic_monitoring_period_fence_idx", table_name="bioacoustic_monitoring_periods")
    op.drop_table("bioacoustic_monitoring_periods")
