"""Webhooks and public verification links."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0018_webhooks_public_verification"
down_revision = "0017_compliance_checklists"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("signing_secret", sa.String(128), nullable=False),
        sa.Column("events", postgresql.ARRAY(sa.String(64)), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_by_user_id",
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
    )
    op.create_index("org_webhook_org_idx", "organization_webhooks", ["organization_id"])
    op.create_index(
        "org_webhook_enabled_idx", "organization_webhooks", ["organization_id", "enabled"]
    )

    op.create_table(
        "webhook_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "webhook_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organization_webhooks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_status", sa.Integer(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("webhook_delivery_webhook_idx", "webhook_deliveries", ["webhook_id", "created_at"])
    op.create_index("webhook_delivery_status_idx", "webhook_deliveries", ["status"])

    op.create_table(
        "public_verification_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("resource_type", sa.String(32), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("label", sa.String(120), nullable=False, server_default=""),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
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
    op.create_index("public_verify_token_idx", "public_verification_links", ["token"])
    op.create_index(
        "public_verify_resource_idx",
        "public_verification_links",
        ["resource_type", "resource_id"],
    )
    op.create_index("public_verify_org_idx", "public_verification_links", ["organization_id"])


def downgrade() -> None:
    op.drop_index("public_verify_org_idx", table_name="public_verification_links")
    op.drop_index("public_verify_resource_idx", table_name="public_verification_links")
    op.drop_index("public_verify_token_idx", table_name="public_verification_links")
    op.drop_table("public_verification_links")
    op.drop_index("webhook_delivery_status_idx", table_name="webhook_deliveries")
    op.drop_index("webhook_delivery_webhook_idx", table_name="webhook_deliveries")
    op.drop_table("webhook_deliveries")
    op.drop_index("org_webhook_enabled_idx", table_name="organization_webhooks")
    op.drop_index("org_webhook_org_idx", table_name="organization_webhooks")
    op.drop_table("organization_webhooks")
