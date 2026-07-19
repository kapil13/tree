"""Monitoring cron job run history.

Revision ID: 0012_monitoring_job_runs
Revises: 0011_project_members
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0012_monitoring_job_runs"
down_revision = "0011_project_members"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monitoring_job_runs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("job_name", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("result", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("error_message", sa.Text()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "monitoring_job_runs_name_time_idx",
        "monitoring_job_runs",
        ["job_name", "finished_at"],
    )


def downgrade() -> None:
    op.drop_index("monitoring_job_runs_name_time_idx", table_name="monitoring_job_runs")
    op.drop_table("monitoring_job_runs")
