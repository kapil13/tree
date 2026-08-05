"""Citizen engagement — tree stewards and gamification profile."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0036_citizen_engagement"
down_revision = "0035_platform_governance_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tree_stewards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tree_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(16), nullable=False, server_default="adopter"),
        sa.Column("nickname", sa.String(128), nullable=True),
        sa.Column("adopted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tree_id", "user_id", name="tree_stewards_tree_user_uq"),
    )
    op.create_index("tree_stewards_user_idx", "tree_stewards", ["user_id"])
    op.create_index("tree_stewards_tree_idx", "tree_stewards", ["tree_id"])

    op.create_table(
        "citizen_profiles",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("badges", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("stewardship_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_stewardship_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("onboarding_steps", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("citizen_profiles")
    op.drop_table("tree_stewards")
