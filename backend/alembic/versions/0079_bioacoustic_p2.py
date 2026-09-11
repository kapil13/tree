"""Bioacoustic P2 — monitoring plans, compliance evidence, trends support."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0079_bioacoustic_p2"
down_revision = "0078_bioacoustic_p1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bioacoustic_monitoring_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fence_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plantation_fences.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("scheme_code", sa.String(64), nullable=True),
        sa.Column("protocol_key", sa.String(64), nullable=False, server_default="default"),
        sa.Column("label", sa.String(128), nullable=False),
        sa.Column("cadence_days", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("min_recordings_per_cycle", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("season_class", sa.String(32), nullable=False, server_default="unspecified"),
        sa.Column("next_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="on_track"),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "bioacoustic_monitoring_plan_project_idx",
        "bioacoustic_monitoring_plans",
        ["project_id", "next_due_at"],
    )

    op.create_table(
        "bioacoustic_compliance_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "recording_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bioacoustic_recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planting_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("checklist_code", sa.String(64), nullable=False),
        sa.Column("checklist_item_id", sa.String(64), nullable=False),
        sa.Column(
            "linked_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint(
            "recording_id",
            "checklist_code",
            "checklist_item_id",
            name="bioacoustic_compliance_evidence_uq",
        ),
    )
    op.create_index(
        "bioacoustic_compliance_evidence_project_idx",
        "bioacoustic_compliance_evidence",
        ["project_id", "checklist_code"],
    )


def downgrade() -> None:
    op.drop_index("bioacoustic_compliance_evidence_project_idx", table_name="bioacoustic_compliance_evidence")
    op.drop_table("bioacoustic_compliance_evidence")
    op.drop_index("bioacoustic_monitoring_plan_project_idx", table_name="bioacoustic_monitoring_plans")
    op.drop_table("bioacoustic_monitoring_plans")
