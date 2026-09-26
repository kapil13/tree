"""Phase H — webhook retries, delivery receipts, suppress list."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0088_phase_h_integration_ops"
down_revision = "0087_platform_rls_policies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "webhook_deliveries",
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "webhook_deliveries",
        sa.Column("dead_lettered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "webhook_delivery_retry_idx",
        "webhook_deliveries",
        ["status", "next_retry_at"],
    )

    op.create_table(
        "message_delivery_receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("channel", sa.String(16), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("message_id", sa.String(128), nullable=True),
        sa.Column("template_key", sa.String(64), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="sent"),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
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
    )
    op.create_index(
        "message_delivery_receipts_channel_idx",
        "message_delivery_receipts",
        ["channel", "status"],
    )
    op.create_index(
        "message_delivery_receipts_recipient_idx",
        "message_delivery_receipts",
        ["recipient"],
    )
    op.create_index(
        "message_delivery_receipts_message_id_idx",
        "message_delivery_receipts",
        ["message_id"],
    )

    op.create_table(
        "suppressed_recipients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("channel", sa.String(16), nullable=False),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column("source", sa.String(32), nullable=False, server_default="resend"),
        sa.Column("provider_event_id", sa.String(128), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
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
        sa.UniqueConstraint("channel", "recipient", name="suppressed_recipients_channel_recipient_uq"),
    )
    op.create_index("suppressed_recipients_reason_idx", "suppressed_recipients", ["reason"])


def downgrade() -> None:
    op.drop_index("suppressed_recipients_reason_idx", table_name="suppressed_recipients")
    op.drop_table("suppressed_recipients")
    op.drop_index("message_delivery_receipts_message_id_idx", table_name="message_delivery_receipts")
    op.drop_index("message_delivery_receipts_recipient_idx", table_name="message_delivery_receipts")
    op.drop_index("message_delivery_receipts_channel_idx", table_name="message_delivery_receipts")
    op.drop_table("message_delivery_receipts")
    op.drop_index("webhook_delivery_retry_idx", table_name="webhook_deliveries")
    op.drop_column("webhook_deliveries", "dead_lettered_at")
    op.drop_column("webhook_deliveries", "next_retry_at")
