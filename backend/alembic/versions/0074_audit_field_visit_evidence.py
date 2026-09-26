"""Sprint 1 — field visit evidence: tree presence, GPS, photos."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0074_audit_field_visit_evidence"
down_revision = "0073_audit_portfolio_phase8"
branch_labels = None
depends_on = None

TREE_PRESENCE = ("present", "absent", "sparse", "not_assessable")


def upgrade() -> None:
    op.add_column(
        "audit_field_visits",
        sa.Column("tree_presence", sa.String(32), nullable=True),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("visitor_lat", sa.Numeric(9, 6), nullable=True),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("visitor_lon", sa.Numeric(9, 6), nullable=True),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("distance_from_plot_m", sa.Numeric(8, 2), nullable=True),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column("inside_boundary", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "audit_field_visits",
        sa.Column(
            "photo_keys",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("audit_field_visits", "photo_keys")
    op.drop_column("audit_field_visits", "inside_boundary")
    op.drop_column("audit_field_visits", "distance_from_plot_m")
    op.drop_column("audit_field_visits", "visitor_lon")
    op.drop_column("audit_field_visits", "visitor_lat")
    op.drop_column("audit_field_visits", "tree_presence")
