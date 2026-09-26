"""CMS custom planting templates."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0032_planting_custom_templates"
down_revision = "0031_rule_engine_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planting_custom_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("segment", sa.String(48), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("compliance_mode", sa.String(16), nullable=False, server_default="guided"),
        sa.Column(
            "recommended_program_codes",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("rules", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("clone_source_code", sa.String(64), nullable=True),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_by_user_id",
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
    op.create_index(
        "planting_custom_templates_segment_idx",
        "planting_custom_templates",
        ["segment"],
    )


def downgrade() -> None:
    op.drop_index("planting_custom_templates_segment_idx", table_name="planting_custom_templates")
    op.drop_table("planting_custom_templates")
