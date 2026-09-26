"""Site visit tracking for marketing footer counter."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0089_site_visits"
down_revision = "0088_phase_h_integration_ops"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_visits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("visitor_id", sa.String(36), nullable=False),
        sa.Column("path", sa.String(512), nullable=False),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("referrer", sa.String(1024), nullable=True),
        sa.Column("locale", sa.String(8), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("site_visits_created_at_idx", "site_visits", ["created_at"])
    op.create_index("site_visits_ip_created_idx", "site_visits", ["ip", "created_at"])
    op.create_index("site_visits_path_created_idx", "site_visits", ["path", "created_at"])
    op.create_index("site_visits_visitor_created_idx", "site_visits", ["visitor_id", "created_at"])


def downgrade() -> None:
    op.drop_index("site_visits_visitor_created_idx", table_name="site_visits")
    op.drop_index("site_visits_path_created_idx", table_name="site_visits")
    op.drop_index("site_visits_ip_created_idx", table_name="site_visits")
    op.drop_index("site_visits_created_at_idx", table_name="site_visits")
    op.drop_table("site_visits")
