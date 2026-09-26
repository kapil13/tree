"""Mortality tables + project risk assessments + tree survival events.

Revision ID: 0039_mortality_dynamic_buffer
Revises: 0038_carbon_uncertainty
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0039_mortality_dynamic_buffer"
down_revision = "0038_carbon_uncertainty"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_risk_assessments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("nprt_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("buffer_pct", sa.Numeric(5, 4), nullable=False),
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("assessor_id", sa.UUID(), nullable=True),
        sa.Column("factors", sa.dialects.postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("notes", sa.String(1024), nullable=True),
        sa.ForeignKeyConstraint(["assessor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "project_risk_assessments_project_idx",
        "project_risk_assessments",
        ["project_id", "assessed_at"],
    )

    op.create_table(
        "tree_survival_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tree_id", sa.UUID(), nullable=False),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("cause", sa.String(128), nullable=True),
        sa.Column("evidence_key", sa.String(512), nullable=True),
        sa.Column("recorded_by_id", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["recorded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "tree_survival_events_tree_idx",
        "tree_survival_events",
        ["tree_id", "event_at"],
    )


def downgrade() -> None:
    op.drop_index("tree_survival_events_tree_idx", table_name="tree_survival_events")
    op.drop_table("tree_survival_events")
    op.drop_index("project_risk_assessments_project_idx", table_name="project_risk_assessments")
    op.drop_table("project_risk_assessments")
