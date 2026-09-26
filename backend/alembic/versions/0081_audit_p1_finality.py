"""Estate Watch P1: policy evaluations, verification snapshots, cycle-scoped attestation."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0081_audit_p1_finality"
down_revision = "0080_audit_kernel_cycles_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_policy_evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cycle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("engagement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("policy_version", sa.String(32), nullable=False, server_default="1.0"),
        sa.Column("result", sa.String(16), nullable=False),
        sa.Column("blocking_items", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("warnings", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("waivers", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("evaluated_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("audit_policy_evaluations_cycle_idx", "audit_policy_evaluations", ["cycle_id", "evaluated_at"])
    op.create_index("audit_policy_evaluations_engagement_idx", "audit_policy_evaluations", ["engagement_id"])

    op.create_table(
        "audit_verification_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cycle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("engagement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("attestation_hash", sa.String(64), nullable=False),
        sa.Column("export_hash", sa.String(64), nullable=True),
        sa.Column("content_manifest_hash", sa.String(64), nullable=True),
        sa.Column("snapshot_json", postgresql.JSONB(), nullable=False),
        sa.Column("snapshot_hash", sa.String(64), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("cycle_id", name="audit_verification_snapshots_cycle_uq"),
    )
    op.create_index(
        "audit_verification_snapshots_attestation_hash_idx",
        "audit_verification_snapshots",
        ["attestation_hash"],
    )
    op.create_index(
        "audit_verification_snapshots_snapshot_hash_idx",
        "audit_verification_snapshots",
        ["snapshot_hash"],
    )

    op.add_column(
        "audit_attestation_signatures",
        sa.Column("cycle_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "audit_reviewer_attestations",
        sa.Column("cycle_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.execute("""
        UPDATE audit_attestation_signatures s
        SET cycle_id = c.id
        FROM audit_cycles c
        WHERE c.engagement_id = s.engagement_id
          AND c.status IN ('attested', 'under_review', 'export_ready', 'superseded')
          AND c.cycle_number = (
              SELECT MAX(c2.cycle_number)
              FROM audit_cycles c2
              WHERE c2.engagement_id = s.engagement_id
                AND c2.status IN ('attested', 'under_review', 'export_ready', 'superseded')
          )
    """)
    op.execute("""
        UPDATE audit_reviewer_attestations a
        SET cycle_id = c.id
        FROM audit_cycles c
        WHERE c.engagement_id = a.engagement_id
          AND c.status IN ('attested', 'superseded')
          AND c.cycle_number = (
              SELECT MAX(c2.cycle_number)
              FROM audit_cycles c2
              WHERE c2.engagement_id = a.engagement_id
                AND c2.status IN ('attested', 'superseded')
          )
    """)
    op.execute("""
        UPDATE audit_attestation_signatures s
        SET cycle_id = c.id
        FROM audit_cycles c
        WHERE s.cycle_id IS NULL
          AND c.engagement_id = s.engagement_id
          AND c.cycle_number = 1
    """)
    op.execute("""
        UPDATE audit_reviewer_attestations a
        SET cycle_id = c.id
        FROM audit_cycles c
        WHERE a.cycle_id IS NULL
          AND c.engagement_id = a.engagement_id
          AND c.cycle_number = 1
    """)
    op.create_foreign_key(
        "audit_attestation_signatures_cycle_id_fkey",
        "audit_attestation_signatures",
        "audit_cycles",
        ["cycle_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "audit_reviewer_attestations_cycle_id_fkey",
        "audit_reviewer_attestations",
        "audit_cycles",
        ["cycle_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.alter_column("audit_attestation_signatures", "cycle_id", nullable=False)
    op.alter_column("audit_reviewer_attestations", "cycle_id", nullable=False)

    op.drop_constraint("audit_reviewer_attestations_engagement_uq", "audit_reviewer_attestations", type_="unique")
    op.drop_constraint("audit_attestation_signatures_eng_reviewer_uq", "audit_attestation_signatures", type_="unique")
    op.create_unique_constraint(
        "audit_reviewer_attestations_cycle_uq",
        "audit_reviewer_attestations",
        ["cycle_id"],
    )
    op.create_unique_constraint(
        "audit_attestation_signatures_cycle_reviewer_uq",
        "audit_attestation_signatures",
        ["cycle_id", "reviewer_id"],
    )
    op.create_index("audit_attestation_signatures_cycle_idx", "audit_attestation_signatures", ["cycle_id"])
    op.create_index("audit_reviewer_attestations_cycle_idx", "audit_reviewer_attestations", ["cycle_id"])


def downgrade() -> None:
    raise NotImplementedError("P1 finality downgrade is unsupported: it would break immutable audit history.")
