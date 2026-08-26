"""Wind-aligned CH4 fusion assessment history.

Revision ID: 0057_emission_fusion_assessments
Revises: 0056_emission_satellite_scans
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0057_emission_fusion_assessments"
down_revision = "0056_emission_satellite_scans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "emission_fusion_assessments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("work_area_id", sa.UUID(), nullable=False),
        sa.Column("dispersion_simulation_id", sa.UUID(), nullable=False),
        sa.Column("satellite_scan_id", sa.UUID(), nullable=False),
        sa.Column("emission_source_ids", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("alignment_score", sa.Numeric(5, 1), nullable=False, server_default="0.0"),
        sa.Column("verdict", sa.String(length=16), nullable=False, server_default="uncertain"),
        sa.Column("result", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="complete"),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["dispersion_simulation_id"], ["dispersion_simulations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["satellite_scan_id"], ["emission_satellite_scans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_area_id"], ["plantation_fences.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "emission_fusion_assessments_project_idx", "emission_fusion_assessments", ["project_id"]
    )
    op.create_index(
        "emission_fusion_assessments_work_area_idx", "emission_fusion_assessments", ["work_area_id"]
    )


def downgrade() -> None:
    op.drop_index("emission_fusion_assessments_work_area_idx", table_name="emission_fusion_assessments")
    op.drop_index("emission_fusion_assessments_project_idx", table_name="emission_fusion_assessments")
    op.drop_table("emission_fusion_assessments")
