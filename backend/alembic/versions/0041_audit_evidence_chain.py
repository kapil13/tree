"""Tamper-evident audit chain + daily roots.

Revision ID: 0041_audit_evidence_chain
Revises: 0040_dpdp_privacy
"""

from __future__ import annotations

import hashlib
import json

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

revision = "0041_audit_evidence_chain"
down_revision = "0040_dpdp_privacy"
branch_labels = None
depends_on = None

GENESIS_HASH = "0" * 64


def _canonical(payload: dict) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def _record_hash(prev_hash: str, payload: dict) -> str:
    return hashlib.sha256((prev_hash + _canonical(payload)).encode()).hexdigest()


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("prev_hash", sa.String(64), nullable=True))
    op.add_column("audit_logs", sa.Column("record_hash", sa.String(64), nullable=True))

    conn = op.get_bind()
    rows = conn.execute(
        text(
            """
            SELECT id, actor_user_id, organization_id, action, resource_type,
                   resource_id, ip::text, user_agent, diff, created_at
            FROM audit_logs
            ORDER BY created_at ASC, id ASC
            """
        )
    ).fetchall()

    prev = GENESIS_HASH
    for row in rows:
        payload = {
            "id": str(row.id),
            "actor_user_id": str(row.actor_user_id) if row.actor_user_id else None,
            "organization_id": str(row.organization_id) if row.organization_id else None,
            "action": row.action,
            "resource_type": row.resource_type,
            "resource_id": str(row.resource_id) if row.resource_id else None,
            "ip": row.ip,
            "user_agent": row.user_agent,
            "diff": row.diff,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        record_hash = _record_hash(prev, payload)
        conn.execute(
            text(
                "UPDATE audit_logs SET prev_hash = :prev_hash, record_hash = :record_hash WHERE id = :id"
            ),
            {"prev_hash": prev, "record_hash": record_hash, "id": row.id},
        )
        prev = record_hash

    op.alter_column("audit_logs", "prev_hash", nullable=False)
    op.alter_column("audit_logs", "record_hash", nullable=False)
    op.create_index("audit_record_hash_idx", "audit_logs", ["record_hash"], unique=True)

    op.create_table(
        "audit_chain_roots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("chain_date", sa.Date(), nullable=False),
        sa.Column("root_hash", sa.String(64), nullable=False),
        sa.Column("record_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chain_date"),
    )


def downgrade() -> None:
    op.drop_table("audit_chain_roots")
    op.drop_index("audit_record_hash_idx", table_name="audit_logs")
    op.drop_column("audit_logs", "record_hash")
    op.drop_column("audit_logs", "prev_hash")
