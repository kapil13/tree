"""Phase 1: photo content hashes for duplicate detection."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0062_phase1_photo_integrity"
down_revision = "0061_phase0_integrity_satellite"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tree_images",
        sa.Column("content_sha256", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "tree_images",
        sa.Column("perceptual_hash", sa.String(length=32), nullable=True),
    )
    op.create_index(
        "tree_images_content_sha256_idx",
        "tree_images",
        ["content_sha256"],
        postgresql_where=sa.text("content_sha256 IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("tree_images_content_sha256_idx", table_name="tree_images")
    op.drop_column("tree_images", "perceptual_hash")
    op.drop_column("tree_images", "content_sha256")
