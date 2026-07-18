"""Platform module rules for superadmin feature flags.

Revision ID: 0010_platform_module_rules
Revises: 0009_survival_survey
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0010_platform_module_rules"
down_revision = "0009_survival_survey"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_module_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("module_key", sa.String(64), nullable=False, unique=True),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("description", sa.String(512), nullable=False, server_default=""),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("allowed_roles", postgresql.ARRAY(sa.String(32)), nullable=False, server_default="{}"),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("platform_module_rules_key_idx", "platform_module_rules", ["module_key"])


def downgrade() -> None:
    op.drop_index("platform_module_rules_key_idx", table_name="platform_module_rules")
    op.drop_table("platform_module_rules")
