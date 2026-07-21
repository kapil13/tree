"""CMS tables for marketing site content."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0019_cms_site_content"
down_revision = "0018_webhooks_public_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cms_site_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("config_key", sa.String(64), nullable=False, unique=True),
        sa.Column("data", postgresql.JSONB(), nullable=False, server_default="{}"),
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
        "cms_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("meta_description", sa.Text(), nullable=False, server_default=""),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_home", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
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
    op.create_index("cms_pages_published_idx", "cms_pages", ["published"])

    op.create_table(
        "cms_sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cms_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section_type", sa.String(64), nullable=False),
        sa.Column("anchor_id", sa.String(64), nullable=True),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("content", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        sa.UniqueConstraint("page_id", "anchor_id", name="cms_sections_page_anchor_uq"),
    )
    op.create_index("cms_sections_page_order_idx", "cms_sections", ["page_id", "sort_order"])


def downgrade() -> None:
    op.drop_index("cms_sections_page_order_idx", table_name="cms_sections")
    op.drop_table("cms_sections")
    op.drop_index("cms_pages_published_idx", table_name="cms_pages")
    op.drop_table("cms_pages")
    op.drop_table("cms_site_config")
