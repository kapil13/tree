"""Project credit ledger tables."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0015_credit_ledger"
down_revision = "0014_audit_org_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_credit_ledgers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("methodology", sa.String(64), nullable=False, server_default="VERRA_VM0047"),
        sa.Column("status", sa.String(32), nullable=False, server_default="estimated"),
        sa.Column("tree_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("gross_credits_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("buffer_pct", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("buffer_withheld_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("net_credits_tco2e", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("issued_credits_tco2e", sa.Numeric(14, 4), nullable=True),
        sa.Column("registry_reference", sa.String(255), nullable=True),
        sa.Column("engine_version", sa.String(64), nullable=False),
        sa.Column("strata", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("last_computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("credit_ledger_org_idx", "project_credit_ledgers", ["organization_id"])
    op.create_index("credit_ledger_status_idx", "project_credit_ledgers", ["status"])

    op.create_table(
        "credit_ledger_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ledger_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("project_credit_ledgers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("from_status", sa.String(32), nullable=True),
        sa.Column("to_status", sa.String(32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("registry_reference", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "credit_ledger_event_ledger_idx",
        "credit_ledger_events",
        ["ledger_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("credit_ledger_event_ledger_idx", table_name="credit_ledger_events")
    op.drop_table("credit_ledger_events")
    op.drop_index("credit_ledger_status_idx", table_name="project_credit_ledgers")
    op.drop_index("credit_ledger_org_idx", table_name="project_credit_ledgers")
    op.drop_table("project_credit_ledgers")
