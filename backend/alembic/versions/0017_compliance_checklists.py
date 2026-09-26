"""Compliance checklist migration."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0017_compliance_checklists"
down_revision = "0016_credit_ledger_timestamps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_checklist_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("checklist_code", sa.String(64), nullable=False),
        sa.Column("responses", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("completion_pct", sa.Numeric(5, 1), nullable=False, server_default="0"),
        sa.Column("score_pct", sa.Numeric(5, 1), nullable=False, server_default="0"),
        sa.Column("eligibility_status", sa.String(32), nullable=False, server_default="not_started"),
        sa.Column(
            "last_updated_by_user_id",
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
        sa.UniqueConstraint("project_id", "checklist_code", name="project_checklist_code_uq"),
    )
    op.create_index("project_checklist_org_idx", "project_checklist_responses", ["organization_id"])
    op.create_index(
        "project_checklist_status_idx", "project_checklist_responses", ["eligibility_status"]
    )


def downgrade() -> None:
    op.drop_index("project_checklist_status_idx", table_name="project_checklist_responses")
    op.drop_index("project_checklist_org_idx", table_name="project_checklist_responses")
    op.drop_table("project_checklist_responses")
