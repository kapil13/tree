"""GHG emission sources and dispersion simulation tables.

Revision ID: 0055_emission_dispersion
Revises: 0054_refresh_homepage_compliance_phase_e
"""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0055_emission_dispersion"
down_revision = "0054_refresh_homepage_compliance_phase_e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "emission_sources",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("work_area_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("gas_type", sa.String(length=8), nullable=False),
        sa.Column("geometry_kind", sa.String(length=16), nullable=False),
        sa.Column("location", Geography(geometry_type="GEOMETRY", srid=4326), nullable=False),
        sa.Column("emission_rate_g_s", sa.Numeric(14, 6), nullable=True),
        sa.Column("annual_emission_tons", sa.Numeric(14, 4), nullable=True),
        sa.Column("release_height_m", sa.Numeric(8, 2), nullable=False, server_default="2.0"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("owner_user_id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_area_id"], ["plantation_fences.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("emission_sources_project_idx", "emission_sources", ["project_id"])
    op.create_index("emission_sources_work_area_idx", "emission_sources", ["work_area_id"])
    op.create_index(
        "emission_sources_location_gix",
        "emission_sources",
        ["location"],
        postgresql_using="gist",
    )

    op.create_table(
        "dispersion_simulations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("work_area_id", sa.UUID(), nullable=False),
        sa.Column("emission_source_ids", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("met_provider", sa.String(length=32), nullable=False, server_default="open-meteo"),
        sa.Column("met_snapshot", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("result", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="complete"),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_area_id"], ["plantation_fences.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("dispersion_simulations_project_idx", "dispersion_simulations", ["project_id"])
    op.create_index(
        "dispersion_simulations_work_area_idx", "dispersion_simulations", ["work_area_id"]
    )


def downgrade() -> None:
    op.drop_index("dispersion_simulations_work_area_idx", table_name="dispersion_simulations")
    op.drop_index("dispersion_simulations_project_idx", table_name="dispersion_simulations")
    op.drop_table("dispersion_simulations")
    op.drop_index("emission_sources_location_gix", table_name="emission_sources")
    op.drop_index("emission_sources_work_area_idx", table_name="emission_sources")
    op.drop_index("emission_sources_project_idx", table_name="emission_sources")
    op.drop_table("emission_sources")
