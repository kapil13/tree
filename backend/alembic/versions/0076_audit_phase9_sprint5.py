"""Estate Watch Phase 9 Sprint 5 — co-signatures and public verify."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0076_audit_phase9_sprint5"
down_revision = "0075_audit_sampling_hybrid"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_attestation_signatures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("role", sa.String(16), nullable=False, server_default="lead"),
        sa.Column("verdict", sa.String(32), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("signature_hash", sa.String(64), nullable=False),
        sa.Column("epistemic_label", sa.String(16), nullable=False, server_default="ATTESTATION"),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("engagement_id", "reviewer_id", name="audit_attestation_signatures_eng_reviewer_uq"),
    )
    op.create_index(
        "audit_attestation_signatures_engagement_idx",
        "audit_attestation_signatures",
        ["engagement_id"],
    )
    op.create_index(
        "audit_attestation_signatures_hash_idx",
        "audit_attestation_signatures",
        ["signature_hash"],
    )

    op.execute(
        """
        INSERT INTO audit_attestation_signatures (
            id, engagement_id, reviewer_id, role, verdict, summary, notes,
            signature_hash, epistemic_label, signed_at
        )
        SELECT
            gen_random_uuid(),
            engagement_id,
            reviewer_id,
            'lead',
            verdict,
            summary,
            notes,
            COALESCE(attestation_hash, ''),
            epistemic_label,
            COALESCE(signed_at, NOW())
        FROM audit_reviewer_attestations
        WHERE status = 'signed' AND reviewer_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("audit_attestation_signatures_hash_idx", table_name="audit_attestation_signatures")
    op.drop_index("audit_attestation_signatures_engagement_idx", table_name="audit_attestation_signatures")
    op.drop_table("audit_attestation_signatures")
