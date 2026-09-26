"""Per-user platform module grants."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0033_platform_user_module_grants"
down_revision = "0032_planting_custom_templates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_user_module_grants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("module_key", sa.String(64), nullable=False),
        sa.Column(
            "granted_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", "module_key", name="platform_user_module_grants_uq"),
    )
    op.create_index(
        "platform_user_module_grants_user_idx",
        "platform_user_module_grants",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("platform_user_module_grants_user_idx", table_name="platform_user_module_grants")
    op.drop_table("platform_user_module_grants")
