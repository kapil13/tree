"""monitoring_scan_targets — Phase A universal scan registry."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0066_monitoring_scan_targets"
down_revision = "0065_india_cities_district_code"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monitoring_scan_targets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("target_type", sa.String(16), nullable=False),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trees.id", ondelete="CASCADE")),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="CASCADE"),
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("program_code", sa.String(64)),
        sa.Column("scheme_code", sa.String(64)),
        sa.Column("scan_tier", sa.String(64), nullable=False, server_default="default"),
        sa.Column("scan_tile", sa.String(32)),
        sa.Column("interval_days", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("watch_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_scan_at", sa.DateTime(timezone=True)),
        sa.Column("next_due_at", sa.DateTime(timezone=True)),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("tree_id", name="monitoring_scan_targets_tree_uq"),
        sa.UniqueConstraint("fence_id", name="monitoring_scan_targets_fence_uq"),
    )
    op.create_index(
        "monitoring_scan_targets_due_idx",
        "monitoring_scan_targets",
        ["next_due_at", "target_type"],
    )
    op.create_index(
        "monitoring_scan_targets_tile_idx",
        "monitoring_scan_targets",
        ["scan_tile"],
    )


def downgrade() -> None:
    op.drop_index("monitoring_scan_targets_tile_idx", table_name="monitoring_scan_targets")
    op.drop_index("monitoring_scan_targets_due_idx", table_name="monitoring_scan_targets")
    op.drop_table("monitoring_scan_targets")
