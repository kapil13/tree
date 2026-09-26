"""Estate Watch Wave E: AI explain-only audit narratives (P14)."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0086_audit_wave_e_explain"
down_revision = "0085_audit_wave_d_export_methodology"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_explain_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cycle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("target_type", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(128), nullable=False),
        sa.Column("mode", sa.String(16), nullable=False),
        sa.Column("provider", sa.String(32), nullable=True),
        sa.Column("input_manifest_hash", sa.String(64), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("citations", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("llm_error", sa.Text(), nullable=True),
        sa.Column(
            "audit_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "audit_explain_runs_engagement_idx",
        "audit_explain_runs",
        ["engagement_id", "created_at"],
    )
    op.create_index(
        "audit_explain_runs_target_idx",
        "audit_explain_runs",
        ["target_type", "target_id", "created_at"],
    )


def downgrade() -> None:
    raise NotImplementedError("Wave E downgrade is unsupported: it would break immutable audit history.")
