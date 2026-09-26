"""Week 4 list performance indexes."""

from __future__ import annotations

from alembic import op

revision = "0027_week4_list_indexes"
down_revision = "0026_program_access_org_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS alerts_user_unread_created_idx
        ON alerts (user_id, is_read, created_at DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS trees_org_status_idx
        ON trees (organization_id, status)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS trees_org_status_idx")
    op.execute("DROP INDEX IF EXISTS alerts_user_unread_created_idx")
