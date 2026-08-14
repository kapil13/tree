"""Carbon uncertainty CI columns on carbon_calculations.

Revision ID: 0038_carbon_uncertainty
Revises: 0037_tree_measurements
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0038_carbon_uncertainty"
down_revision = "0037_tree_measurements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "carbon_calculations",
        sa.Column("co2e_kg_lower_90", sa.Numeric(12, 2)),
    )
    op.add_column(
        "carbon_calculations",
        sa.Column("co2e_kg_upper_90", sa.Numeric(12, 2)),
    )
    op.add_column(
        "carbon_calculations",
        sa.Column("uncertainty_pct", sa.Numeric(6, 2)),
    )
    op.add_column(
        "carbon_calculations",
        sa.Column("verra_deduction_pct", sa.Numeric(6, 2)),
    )
    op.add_column(
        "carbon_calculations",
        sa.Column("creditable_co2e_kg", sa.Numeric(12, 2)),
    )


def downgrade() -> None:
    op.drop_column("carbon_calculations", "creditable_co2e_kg")
    op.drop_column("carbon_calculations", "verra_deduction_pct")
    op.drop_column("carbon_calculations", "uncertainty_pct")
    op.drop_column("carbon_calculations", "co2e_kg_upper_90")
    op.drop_column("carbon_calculations", "co2e_kg_lower_90")
