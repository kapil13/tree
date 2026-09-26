"""Rule engine v2 — versions, project overrides, checklist overrides."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0031_rule_engine_v2"
down_revision = "0030_planting_rule_template_overrides"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "planting_rule_template_overrides",
        sa.Column("compliance_mode", sa.String(16), nullable=True),
    )
    op.add_column(
        "planting_rule_template_overrides",
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "planting_rule_template_overrides",
        sa.Column("publish_note", sa.Text(), nullable=True),
    )

    op.create_table(
        "planting_rule_template_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_code", sa.String(64), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("rules", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("compliance_mode", sa.String(16), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("publish_note", sa.Text(), nullable=True),
        sa.Column("is_rollback", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
    )
    op.create_index(
        "planting_rule_template_versions_code_ver_idx",
        "planting_rule_template_versions",
        ["template_code", "version_number"],
        unique=True,
    )

    op.create_table(
        "planting_project_rule_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("rules", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("compliance_mode", sa.String(16), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("publish_note", sa.Text(), nullable=True),
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

    op.create_table(
        "compliance_checklist_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("checklist_code", sa.String(64), nullable=False, unique=True),
        sa.Column("item_overrides", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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


def downgrade() -> None:
    op.drop_table("compliance_checklist_overrides")
    op.drop_table("planting_project_rule_overrides")
    op.drop_index(
        "planting_rule_template_versions_code_ver_idx",
        table_name="planting_rule_template_versions",
    )
    op.drop_table("planting_rule_template_versions")
    op.drop_column("planting_rule_template_overrides", "publish_note")
    op.drop_column("planting_rule_template_overrides", "effective_from")
    op.drop_column("planting_rule_template_overrides", "compliance_mode")
