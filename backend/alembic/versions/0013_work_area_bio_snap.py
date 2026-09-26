"""Work-area biodiversity baseline snapshots (GBIF + IUCN).

Revision ID: 0013_work_area_biodiversity_snapshots
Revises: 0012_monitoring_job_runs
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0013_work_area_bio_snap"
down_revision = "0012_monitoring_job_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Alembic default version_num is VARCHAR(32); allow longer revision ids going forward.
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128)")

    op.create_table(
        "work_area_biodiversity_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("species_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "species",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "sources",
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
    op.create_index(
        "work_area_bio_snap_fence_time_idx",
        "work_area_biodiversity_snapshots",
        ["fence_id", "captured_at"],
    )


def downgrade() -> None:
    op.drop_index("work_area_bio_snap_fence_time_idx", table_name="work_area_biodiversity_snapshots")
    op.drop_table("work_area_biodiversity_snapshots")
