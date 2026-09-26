"""Satellite health analyses from NDVI time series.

Revision ID: 0003_satellite_health
Revises: 0002_plantation_fences
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003_satellite_health"
down_revision = "0002_plantation_fences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "satellite_health_analyses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE")),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="CASCADE"),
        ),
        sa.Column(
            "triggered_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("model_pipeline", sa.String(255), nullable=False),
        sa.Column("risk_level", sa.String(32), nullable=False),
        sa.Column("health_status", sa.String(64), nullable=False),
        sa.Column("summary", sa.String(2000), nullable=False),
        sa.Column("ndvi_current", sa.Numeric(6, 4)),
        sa.Column("ndvi_trend", sa.String(32)),
        sa.Column("trend_slope", sa.Numeric(8, 5)),
        sa.Column("pest_control_needed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("disease_control_needed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("findings", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("treatments", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("monitoring_plan", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("overall_confidence", sa.Numeric(5, 4)),
        sa.Column("raw_output", postgresql.JSONB),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("sat_health_tree_idx", "satellite_health_analyses", ["tree_id", "created_at"])
    op.create_index("sat_health_fence_idx", "satellite_health_analyses", ["fence_id", "created_at"])


def downgrade() -> None:
    op.drop_index("sat_health_fence_idx", table_name="satellite_health_analyses")
    op.drop_index("sat_health_tree_idx", table_name="satellite_health_analyses")
    op.drop_table("satellite_health_analyses")
