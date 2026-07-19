"""Survival survey interval and re-geotagging migration.

Revision ID: 0009_survival_survey
Revises: 0008_planting_projects
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0009_survival_survey"
down_revision = "0008_planting_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trees",
        sa.Column("last_geotag_at", sa.DateTime(timezone=True)),
    )
    op.execute(
        sa.text("UPDATE trees SET last_geotag_at = registered_at WHERE last_geotag_at IS NULL")
    )
    op.create_index("trees_last_geotag_idx", "trees", ["last_geotag_at"])


def downgrade() -> None:
    op.drop_index("trees_last_geotag_idx", table_name="trees")
    op.drop_column("trees", "last_geotag_at")
