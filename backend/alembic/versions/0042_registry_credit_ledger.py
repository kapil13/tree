"""Registry-grade credit serials, claims, transfers, verification workflow.

Revision ID: 0042_registry_credit_ledger
Revises: 0041_audit_evidence_chain
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0042_registry_credit_ledger"
down_revision = "0041_audit_evidence_chain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "credit_serials",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("serial_number", sa.String(64), nullable=False),
        sa.Column("ledger_event_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=True),
        sa.Column("vintage_year", sa.Integer(), nullable=False),
        sa.Column("tco2e_amount", sa.Numeric(14, 4), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="available"),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("beneficiary", sa.String(255), nullable=True),
        sa.Column("retirement_reason", sa.Text(), nullable=True),
        sa.Column("paris_article6", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("corresponding_adjustment_ref", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ledger_event_id"], ["credit_ledger_events.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("serial_number"),
    )
    op.create_index("credit_serials_project_idx", "credit_serials", ["project_id"])
    op.create_index("credit_serials_status_idx", "credit_serials", ["status"])

    op.create_table(
        "claim_registry",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tree_id", sa.UUID(), nullable=False),
        sa.Column("scheme_code", sa.String(64), nullable=False),
        sa.Column("scheme_family", sa.String(64), nullable=False),
        sa.Column("claim_type", sa.String(32), nullable=False, server_default="carbon"),
        sa.Column("exclusive", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ledger_event_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ledger_event_id"], ["credit_ledger_events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("claim_registry_tree_idx", "claim_registry", ["tree_id"])
    op.create_index(
        "claim_registry_exclusive_active_idx",
        "claim_registry",
        ["tree_id", "scheme_family"],
        unique=True,
        postgresql_where=sa.text("exclusive IS TRUE AND valid_to IS NULL"),
    )

    op.create_table(
        "credit_transfers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("serial_id", sa.UUID(), nullable=False),
        sa.Column("from_org_id", sa.UUID(), nullable=False),
        sa.Column("to_org_id", sa.UUID(), nullable=False),
        sa.Column("transferred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("custody_hash", sa.String(64), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["from_org_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["serial_id"], ["credit_serials.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["to_org_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("credit_transfers_serial_idx", "credit_transfers", ["serial_id"])

    op.create_table(
        "verification_samples",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=True),
        sa.Column("sample_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("method", sa.String(32), nullable=False, server_default="random"),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["planting_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("verification_samples_project_idx", "verification_samples", ["project_id"])

    op.create_table(
        "verification_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("sample_id", sa.UUID(), nullable=False),
        sa.Column("tree_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("verifier_id", sa.UUID(), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("attestation_hash", sa.String(64), nullable=True),
        sa.ForeignKeyConstraint(["sample_id"], ["verification_samples.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["verifier_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sample_id", "tree_id"),
    )
    op.create_index("verification_items_sample_idx", "verification_items", ["sample_id", "status"])


def downgrade() -> None:
    op.drop_table("verification_items")
    op.drop_table("verification_samples")
    op.drop_table("credit_transfers")
    op.drop_index("claim_registry_exclusive_active_idx", table_name="claim_registry")
    op.drop_table("claim_registry")
    op.drop_table("credit_serials")
