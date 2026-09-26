"""Platform governance settings — maintenance mode and registration controls."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0035_platform_governance_settings"
down_revision = "0034_user_sessions_invalidated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_governance_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("maintenance_mode", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("maintenance_message", sa.String(1000), nullable=False, server_default=""),
        sa.Column("registration_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "updated_by_user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.execute(
        sa.text(
            "INSERT INTO platform_governance_settings (id, maintenance_mode, maintenance_message, registration_enabled) "
            "VALUES (1, false, '', true)"
        )
    )


def downgrade() -> None:
    op.drop_table("platform_governance_settings")
