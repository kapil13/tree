"""TROPOMI CH4 satellite scan history for GHG emissions.

Revision ID: 0056_emission_satellite_scans
Revises: 0055_emission_dispersion
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0056_emission_satellite_scans"
down_revision = "0055_emission_dispersion"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "emission_satellite_scans",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("work_area_id", sa.UUID(), nullable=False),
        sa.Column("gas_type", sa.String(length=8), nullable=False, server_default="CH4"),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="sentinel-5p-tropomi"),
        sa.Column("buffer_km", sa.Numeric(8, 2), nullable=False, server_default="25.0"),
        sa.Column("roi_geojson", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("series", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("summary", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="complete"),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_area_id"], ["plantation_fences.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("emission_satellite_scans_project_idx", "emission_satellite_scans", ["project_id"])
    op.create_index(
        "emission_satellite_scans_work_area_idx", "emission_satellite_scans", ["work_area_id"]
    )


def downgrade() -> None:
    op.drop_index("emission_satellite_scans_work_area_idx", table_name="emission_satellite_scans")
    op.drop_index("emission_satellite_scans_project_idx", table_name="emission_satellite_scans")
    op.drop_table("emission_satellite_scans")
