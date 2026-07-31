"""User device registrations for mobile push."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0028_user_devices_analytics"
down_revision = "0027_week4_list_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("push_token", sa.String(length=512), nullable=False),
        sa.Column("platform", sa.String(length=16), nullable=False, server_default="android"),
        sa.Column("device_label", sa.String(length=128), nullable=True),
        sa.Column("app_version", sa.String(length=32), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("user_id", "push_token", name="user_devices_user_token_uq"),
    )
    op.create_index("user_devices_user_idx", "user_devices", ["user_id"])
    op.create_index("user_devices_token_idx", "user_devices", ["push_token"])


def downgrade() -> None:
    op.drop_index("user_devices_token_idx", table_name="user_devices")
    op.drop_index("user_devices_user_idx", table_name="user_devices")
    op.drop_table("user_devices")
