"""Bioacoustic recordings for biodiversity monitoring.

Revision ID: 0005_bioacoustic
Revises: 0004_notification_preferences
"""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0005_bioacoustic"
down_revision = "0004_notification_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bioacoustic_recordings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "plantation_fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="SET NULL"),
        ),
        sa.Column("s3_key", sa.String(512), nullable=False),
        sa.Column("duration_seconds", sa.Numeric(8, 2), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326)),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("spectrogram_s3_key", sa.String(512)),
        sa.Column(
            "preprocessing",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "species_detections",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("total_species_count", sa.Integer()),
        sa.Column("total_calls_detected", sa.Integer()),
        sa.Column("shannon_diversity_index", sa.Numeric(8, 4)),
        sa.Column("bioacoustic_health_score", sa.Numeric(5, 2)),
        sa.Column("ai_confidence_score", sa.Numeric(5, 4)),
        sa.Column("analysis_summary", sa.String(2000)),
        sa.Column("raw_output", postgresql.JSONB),
        sa.Column("analyzed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("bioacoustic_owner_idx", "bioacoustic_recordings", ["owner_user_id", "recorded_at"])
    op.create_index(
        "bioacoustic_fence_idx", "bioacoustic_recordings", ["plantation_fence_id", "recorded_at"]
    )


def downgrade() -> None:
    op.drop_index("bioacoustic_fence_idx", table_name="bioacoustic_recordings")
    op.drop_index("bioacoustic_owner_idx", table_name="bioacoustic_recordings")
    op.drop_table("bioacoustic_recordings")
