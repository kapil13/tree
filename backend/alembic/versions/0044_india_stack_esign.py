"""India Stack fields on verification items and user KYC metadata.

Revision ID: 0044_india_stack_esign
Revises: 0043_user_locale
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0044_india_stack_esign"
down_revision = "0043_user_locale"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "verification_items",
        sa.Column("esign_ref", sa.String(128), nullable=True),
    )
    op.add_column(
        "verification_items",
        sa.Column("esign_signature_b64", sa.Text(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("kyc_metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
    )


def downgrade() -> None:
    op.drop_column("users", "kyc_metadata")
    op.drop_column("verification_items", "esign_signature_b64")
    op.drop_column("verification_items", "esign_ref")
