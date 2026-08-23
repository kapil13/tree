"""Safeguards and tenure document store (Compliance Phase A)."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0051_project_safeguard_documents"
down_revision = "0050_refresh_homepage_compliance_phase0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_safeguard_documents",
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
        sa.Column("doc_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "uploaded_by_user_id",
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
    )
    op.create_index(
        "project_safeguard_doc_project_idx",
        "project_safeguard_documents",
        ["project_id"],
    )
    op.create_index(
        "project_safeguard_doc_type_idx",
        "project_safeguard_documents",
        ["doc_type"],
    )


def downgrade() -> None:
    op.drop_index("project_safeguard_doc_type_idx", table_name="project_safeguard_documents")
    op.drop_index("project_safeguard_doc_project_idx", table_name="project_safeguard_documents")
    op.drop_table("project_safeguard_documents")
