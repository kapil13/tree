"""Estate Watch Phase 8 — portfolio ops indexes."""

from __future__ import annotations

from alembic import op

revision = "0073_audit_portfolio_phase8"
down_revision = "0072_audit_attestation_phase7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "audit_field_plots_engagement_status_idx",
        "audit_field_plots",
        ["engagement_id", "status"],
    )
    op.create_index(
        "audit_engagements_status_idx",
        "audit_engagements",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("audit_engagements_status_idx", table_name="audit_engagements")
    op.drop_index("audit_field_plots_engagement_status_idx", table_name="audit_field_plots")
