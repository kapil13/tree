"""VM0047 baseline, additionality, leakage, and carbon pool tables.

Revision ID: 0045_vm0047_icvcm
Revises: 0043_user_locale
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0045_vm0047_icvcm"
down_revision = "0043_user_locale"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_baselines",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("scenario", sa.String(64), nullable=False, server_default="business_as_usual"),
        sa.Column("land_cover_class", sa.String(64), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("baseline_emissions_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("baseline_removals_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("project_baselines_project_idx", "project_baselines", ["project_id", "created_at"])

    op.create_table(
        "additionality_assessments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("score_pct", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("narrative", sa.Text(), nullable=True),
        sa.Column("factors", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("assessor_id", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["assessor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "additionality_assessments_project_idx",
        "additionality_assessments",
        ["project_id", "assessed_at"],
    )

    op.create_table(
        "leakage_accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("leakage_type", sa.String(64), nullable=False, server_default="activity_shifting"),
        sa.Column("estimated_leakage_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("mitigation_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("leakage_accounts_project_idx", "leakage_accounts", ["project_id", "created_at"])

    op.create_table(
        "project_carbon_pools",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("deadwood_ratio", sa.Numeric(6, 4), nullable=False, server_default="0.08"),
        sa.Column("litter_ratio", sa.Numeric(6, 4), nullable=False, server_default="0.04"),
        sa.Column("soc_tco2e_per_ha", sa.Numeric(14, 4), nullable=True),
        sa.Column("area_ha", sa.Numeric(12, 4), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id"),
    )


def downgrade() -> None:
    op.drop_table("project_carbon_pools")
    op.drop_table("leakage_accounts")
    op.drop_table("additionality_assessments")
    op.drop_table("project_baselines")
