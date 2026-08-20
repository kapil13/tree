"""Tree measurement time-series for MRV provenance.

Revision ID: 0037_tree_measurements
Revises: 0036_citizen_engagement
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0037_tree_measurements"
down_revision = "0036_citizen_engagement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tree_measurements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tree_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("method", sa.String(32), nullable=False),
        sa.Column("instrument", sa.String(64)),
        sa.Column(
            "measurer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("dbh_cm", sa.Numeric(6, 2)),
        sa.Column("height_m", sa.Numeric(6, 2)),
        sa.Column("canopy_m", sa.Numeric(6, 2)),
        sa.Column("gps_accuracy_m", sa.Numeric(8, 2)),
        sa.Column("photo_key", sa.String(512)),
        sa.Column("notes", sa.Text()),
        sa.Column("uncertainty_dbh_pct", sa.Numeric(5, 2)),
        sa.Column("uncertainty_height_pct", sa.Numeric(5, 2)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "tree_measurements_tree_measured_idx",
        "tree_measurements",
        ["tree_id", sa.text("measured_at DESC")],
    )
    op.create_index("tree_measurements_measurer_idx", "tree_measurements", ["measurer_id"])

    # Backfill one registration row per existing tree from cached current_* values.
    op.execute(
        sa.text(
            """
            INSERT INTO tree_measurements (
                id, tree_id, measured_at, source, method, measurer_id,
                dbh_cm, height_m, canopy_m, gps_accuracy_m, created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                t.id,
                COALESCE(t.registered_at, t.created_at),
                'registration',
                'visual_estimate',
                t.owner_user_id,
                t.current_dbh_cm,
                t.current_height_m,
                t.current_canopy_m,
                t.accuracy_m,
                COALESCE(t.registered_at, t.created_at),
                COALESCE(t.registered_at, t.created_at)
            FROM trees t
            WHERE NOT EXISTS (
                SELECT 1 FROM tree_measurements tm WHERE tm.tree_id = t.id
            )
            """
        )
    )


def downgrade() -> None:
    op.drop_index("tree_measurements_measurer_idx", table_name="tree_measurements")
    op.drop_index("tree_measurements_tree_measured_idx", table_name="tree_measurements")
    op.drop_table("tree_measurements")
