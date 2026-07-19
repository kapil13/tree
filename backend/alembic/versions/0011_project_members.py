"""Multi-contractor project membership.

Revision ID: 0011_project_members
Revises: 0010_platform_module_rules
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0011_project_members"
down_revision = "0010_platform_module_rules"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_members",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("contractor_name", sa.String(255)),
        sa.Column("work_area_ids", postgresql.JSONB),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("project_id", "user_id", name="project_members_project_user_uq"),
    )
    op.create_index("project_members_user_idx", "project_members", ["user_id"])
    op.create_index("project_members_project_idx", "project_members", ["project_id"])


def downgrade() -> None:
    op.drop_index("project_members_project_idx", table_name="project_members")
    op.drop_index("project_members_user_idx", table_name="project_members")
    op.drop_table("project_members")
