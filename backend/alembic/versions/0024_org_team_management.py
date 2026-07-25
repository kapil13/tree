"""Organization team management — org admin, invites, owner."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0024_org_team_management"
down_revision = "0023_payment_orders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_org_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("users", sa.Column("org_role", sa.String(length=32), nullable=True))

    op.add_column("organizations", sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "organizations_owner_user_id_fkey",
        "organizations",
        "users",
        ["owner_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("organizations_owner_user_idx", "organizations", ["owner_user_id"])

    op.create_table(
        "organization_invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("org_role", sa.String(length=32), nullable=False),
        sa.Column("platform_role", sa.String(length=32), nullable=False),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("invite_token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invite_token", name="organization_invites_token_uq"),
    )
    op.create_index(
        "organization_invites_org_idx",
        "organization_invites",
        ["organization_id"],
    )
    op.create_index(
        "organization_invites_email_idx",
        "organization_invites",
        ["email"],
    )


def downgrade() -> None:
    op.drop_index("organization_invites_email_idx", table_name="organization_invites")
    op.drop_index("organization_invites_org_idx", table_name="organization_invites")
    op.drop_table("organization_invites")
    op.drop_index("organizations_owner_user_idx", table_name="organizations")
    op.drop_constraint("organizations_owner_user_id_fkey", "organizations", type_="foreignkey")
    op.drop_column("organizations", "owner_user_id")
    op.drop_column("users", "org_role")
    op.drop_column("users", "is_org_admin")
