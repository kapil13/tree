"""Sprint 2 — hybrid / area-coverage sampling parameters."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0075_audit_sampling_hybrid"
down_revision = "0074_audit_field_visit_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_sampling_plans",
        sa.Column("ha_per_plot", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "audit_sampling_plans",
        sa.Column("min_plots_per_block", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("audit_sampling_plans", "min_plots_per_block")
    op.drop_column("audit_sampling_plans", "ha_per_plot")
