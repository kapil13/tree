"""Add personal profile fields on users (DOB, location, marriage date)."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0047_user_profile_fields"
down_revision = "0046_plot_monitoring"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("date_of_marriage", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(128), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "state")
    op.drop_column("users", "city")
    op.drop_column("users", "date_of_marriage")
    op.drop_column("users", "date_of_birth")
