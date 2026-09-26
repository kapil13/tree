"""Bioacoustic P0 — analysis versioning, GPS integrity, evidence confidence."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0077_bioacoustic_p0"
down_revision = "0076_audit_phase9_sprint5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bioacoustic_analysis_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "recording_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bioacoustic_recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("run_number", sa.Integer(), nullable=False),
        sa.Column(
            "supersedes_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bioacoustic_analysis_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="completed"),
        sa.Column("pipeline", sa.String(64), nullable=True),
        sa.Column("model_version", sa.String(128), nullable=True),
        sa.Column("config_hash", sa.String(64), nullable=True),
        sa.Column("audio_sha256", sa.String(64), nullable=True),
        sa.Column("methodology_version", sa.String(64), nullable=True),
        sa.Column("species_detections", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("metrics", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("raw_output", postgresql.JSONB(), nullable=True),
        sa.Column("analysis_error", sa.String(2000), nullable=True),
        sa.Column("celery_task_id", sa.String(64), nullable=True),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_species_count", sa.Integer(), nullable=True),
        sa.Column("acoustic_signals_count", sa.Integer(), nullable=True),
        sa.Column("biodiversity_confidence_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("shannon_diversity_index", sa.Numeric(8, 4), nullable=True),
        sa.Column("simpson_diversity_index", sa.Numeric(8, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("recording_id", "run_number", name="bioacoustic_run_recording_number_uq"),
    )
    op.create_index(
        "bioacoustic_run_recording_idx",
        "bioacoustic_analysis_runs",
        ["recording_id", "analyzed_at"],
    )

    op.add_column(
        "bioacoustic_recordings",
        sa.Column("recording_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("recording_ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("gps_accuracy_m", sa.Numeric(8, 2), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("gps_source", sa.String(32), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("gps_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("gps_fallback", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("accepted_species_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("acoustic_signals_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("biodiversity_confidence_score", sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column(
            "latest_analysis_run_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "bioacoustic_recording_latest_run_fk",
        "bioacoustic_recordings",
        "bioacoustic_analysis_runs",
        ["latest_analysis_run_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("bioacoustic_recording_latest_run_fk", "bioacoustic_recordings", type_="foreignkey")
    op.drop_column("bioacoustic_recordings", "latest_analysis_run_id")
    op.drop_column("bioacoustic_recordings", "biodiversity_confidence_score")
    op.drop_column("bioacoustic_recordings", "acoustic_signals_count")
    op.drop_column("bioacoustic_recordings", "accepted_species_count")
    op.drop_column("bioacoustic_recordings", "gps_fallback")
    op.drop_column("bioacoustic_recordings", "gps_verified")
    op.drop_column("bioacoustic_recordings", "gps_source")
    op.drop_column("bioacoustic_recordings", "gps_accuracy_m")
    op.drop_column("bioacoustic_recordings", "recording_ended_at")
    op.drop_column("bioacoustic_recordings", "recording_started_at")
    op.drop_index("bioacoustic_run_recording_idx", table_name="bioacoustic_analysis_runs")
    op.drop_table("bioacoustic_analysis_runs")
