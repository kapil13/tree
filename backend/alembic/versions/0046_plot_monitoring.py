"""Plot-based stratified monitoring tables.

Revision ID: 0046_plot_monitoring
Revises: 0045_vm0047_icvcm
"""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0046_plot_monitoring"
down_revision = "0045_vm0047_icvcm"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plot_monitoring_designs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("mode", sa.String(32), nullable=False, server_default="full_census"),
        sa.Column("stratification", sa.String(32), nullable=False, server_default="work_area"),
        sa.Column("plots_per_stratum", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("plot_area_m2", sa.Numeric(10, 2), nullable=False, server_default="400"),
        sa.Column("layout_seed", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "plot_monitoring_designs_project_idx",
        "plot_monitoring_designs",
        ["project_id"],
        unique=True,
    )

    op.create_table(
        "plot_monitoring_strata",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("design_id", sa.UUID(), nullable=False),
        sa.Column("work_area_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("area_ha", sa.Numeric(12, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["design_id"], ["plot_monitoring_designs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_area_id"], ["plantation_fences.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("plot_monitoring_strata_design_idx", "plot_monitoring_strata", ["design_id"])

    op.create_table(
        "plot_monitoring_plots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("stratum_id", sa.UUID(), nullable=False),
        sa.Column("plot_code", sa.String(64), nullable=False),
        sa.Column("center", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="planned"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["stratum_id"], ["plot_monitoring_strata.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("plot_monitoring_plots_stratum_idx", "plot_monitoring_plots", ["stratum_id"])
    op.create_index(
        "plot_monitoring_plots_code_idx",
        "plot_monitoring_plots",
        ["stratum_id", "plot_code"],
        unique=True,
    )
    op.create_index(
        "plot_monitoring_plots_center_gix",
        "plot_monitoring_plots",
        ["center"],
        postgresql_using="gist",
    )

    op.create_table(
        "plot_visits",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("plot_id", sa.UUID(), nullable=False),
        sa.Column("visited_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("visitor_id", sa.UUID(), nullable=True),
        sa.Column("gps_accuracy_m", sa.Numeric(8, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["plot_id"], ["plot_monitoring_plots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["visitor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("plot_visits_plot_idx", "plot_visits", ["plot_id", "visited_at"])

    op.create_table(
        "plot_observations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("visit_id", sa.UUID(), nullable=False),
        sa.Column("tree_id", sa.UUID(), nullable=True),
        sa.Column("tag_number", sa.String(64), nullable=True),
        sa.Column("species_text", sa.String(255), nullable=True),
        sa.Column("dbh_cm", sa.Numeric(8, 2), nullable=True),
        sa.Column("height_m", sa.Numeric(8, 2), nullable=True),
        sa.Column("alive", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["visit_id"], ["plot_visits.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("plot_observations_visit_idx", "plot_observations", ["visit_id"])


def downgrade() -> None:
    op.drop_table("plot_observations")
    op.drop_table("plot_visits")
    op.drop_table("plot_monitoring_plots")
    op.drop_table("plot_monitoring_strata")
    op.drop_table("plot_monitoring_designs")
