"""DPDP privacy tables — consent, data subject requests, grievances.

Revision ID: 0040_dpdp_privacy
Revises: 0039_mortality_dynamic_buffer
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0040_dpdp_privacy"
down_revision = "0039_mortality_dynamic_buffer"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consent_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("purpose", sa.String(64), nullable=False),
        sa.Column("policy_version", sa.String(32), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip", sa.dialects.postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "consent_records_user_purpose_idx",
        "consent_records",
        ["user_id", "purpose"],
    )

    op.create_table(
        "data_subject_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("request_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("handler_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["handler_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "data_subject_requests_user_idx",
        "data_subject_requests",
        ["user_id", "created_at"],
    )
    op.create_index(
        "data_subject_requests_status_idx",
        "data_subject_requests",
        ["status"],
    )

    op.create_table(
        "grievance_tickets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("officer_id", sa.UUID(), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["officer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "grievance_tickets_user_idx",
        "grievance_tickets",
        ["user_id", "created_at"],
    )
    op.create_index(
        "grievance_tickets_status_idx",
        "grievance_tickets",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("grievance_tickets_status_idx", table_name="grievance_tickets")
    op.drop_index("grievance_tickets_user_idx", table_name="grievance_tickets")
    op.drop_table("grievance_tickets")
    op.drop_index("data_subject_requests_status_idx", table_name="data_subject_requests")
    op.drop_index("data_subject_requests_user_idx", table_name="data_subject_requests")
    op.drop_table("data_subject_requests")
    op.drop_index("consent_records_user_purpose_idx", table_name="consent_records")
    op.drop_table("consent_records")
