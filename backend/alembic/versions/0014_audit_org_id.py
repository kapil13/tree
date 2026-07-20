"""Add organization_id to audit_logs for workspace-scoped queries."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0014_audit_org_id"
down_revision = "0013_work_area_bio_snap"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_logs",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "audit_logs_organization_id_fkey",
        "audit_logs",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("audit_org_created_idx", "audit_logs", ["organization_id", "created_at"])


def downgrade() -> None:
    op.drop_index("audit_org_created_idx", table_name="audit_logs")
    op.drop_constraint("audit_logs_organization_id_fkey", "audit_logs", type_="foreignkey")
    op.drop_column("audit_logs", "organization_id")
