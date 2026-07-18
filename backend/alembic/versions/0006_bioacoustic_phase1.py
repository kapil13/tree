"""Bioacoustic Phase 1: Simpson index, async analysis fields.

Revision ID: 0006_bioacoustic_phase1
Revises: 0005_bioacoustic
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_bioacoustic_phase1"
down_revision = "0005_bioacoustic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("simpson_diversity_index", sa.Numeric(8, 4), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("analysis_error", sa.String(2000), nullable=True),
    )
    op.add_column(
        "bioacoustic_recordings",
        sa.Column("celery_task_id", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bioacoustic_recordings", "celery_task_id")
    op.drop_column("bioacoustic_recordings", "analysis_error")
    op.drop_column("bioacoustic_recordings", "simpson_diversity_index")
