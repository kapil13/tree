"""Add scheme_code to planting projects for central govt scheme tagging."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0029_planting_project_scheme_code"
down_revision = "0028_user_devices_analytics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "planting_projects",
        sa.Column("scheme_code", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "planting_projects_scheme_code_idx",
        "planting_projects",
        ["scheme_code"],
    )


def downgrade() -> None:
    op.drop_index("planting_projects_scheme_code_idx", table_name="planting_projects")
    op.drop_column("planting_projects", "scheme_code")
