"""User notification preferences for satellite health alerts.

Revision ID: 0004_notification_preferences
Revises: 0003_satellite_health
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0004_notification_preferences"
down_revision = "0003_satellite_health"
branch_labels = None
depends_on = None

_DEFAULT_PREFS = (
    '{"satellite_health": {"enabled": true, "channels": ["in_app", "email"], '
    '"sms_on_critical": true}}'
)


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "notification_preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(f"'{_DEFAULT_PREFS}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "notification_preferences")
