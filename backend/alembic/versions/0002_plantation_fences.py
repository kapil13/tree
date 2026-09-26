"""Plantation fence polygons + area-level satellite records.

Revision ID: 0002_plantation_fences
Revises: 0001_initial
Create Date: 2026-07-07
"""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002_plantation_fences"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plantation_fences",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("boundary", Geography(geometry_type="POLYGON", srid=4326), nullable=False),
        sa.Column("area_ha", sa.Numeric(12, 4)),
        sa.Column("last_satellite_at", sa.DateTime(timezone=True)),
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
    op.create_index(
        "plantation_fences_boundary_gix",
        "plantation_fences",
        ["boundary"],
        postgresql_using="gist",
    )
    op.create_index("plantation_fences_owner_idx", "plantation_fences", ["owner_user_id"])
    op.create_index("plantation_fences_org_idx", "plantation_fences", ["organization_id"])

    op.create_table(
        "plantation_satellite_records",
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
        sa.Column("provider", sa.String(64), nullable=False),
        sa.Column("scene_id", sa.String(255), nullable=False),
        sa.Column("scene_acquired_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cloud_cover_pct", sa.Numeric(5, 2)),
        sa.Column("ndvi_mean", sa.Numeric(6, 4)),
        sa.Column("ndvi_max", sa.Numeric(6, 4)),
        sa.Column("ndvi_min", sa.Numeric(6, 4)),
        sa.Column("evi_mean", sa.Numeric(6, 4)),
        sa.Column("presence_confirmed", sa.Boolean),
        sa.Column("change_vs_baseline", sa.Numeric(6, 4)),
        sa.Column("thumbnail_s3_key", sa.String(1024)),
        sa.Column("raw_metadata", postgresql.JSONB),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "plantation_sat_fence_time_idx",
        "plantation_satellite_records",
        ["fence_id", "scene_acquired_at"],
    )


def downgrade() -> None:
    op.drop_index("plantation_sat_fence_time_idx", table_name="plantation_satellite_records")
    op.drop_table("plantation_satellite_records")
    op.drop_index("plantation_fences_org_idx", table_name="plantation_fences")
    op.drop_index("plantation_fences_owner_idx", table_name="plantation_fences")
    op.drop_index("plantation_fences_boundary_gix", table_name="plantation_fences")
    op.drop_table("plantation_fences")
