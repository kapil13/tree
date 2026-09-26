"""Hash-chained audit log — append, verify, daily root publication."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.audit_chain_root import AuditChainRoot
from app.services.storage import get_storage

GENESIS_HASH = "0" * 64
TRANSPARENCY_PREFIX = "transparency/audit-roots"


def canonical_audit_payload(entry: AuditLog) -> dict[str, Any]:
    return {
        "id": str(entry.id),
        "actor_user_id": str(entry.actor_user_id) if entry.actor_user_id else None,
        "organization_id": str(entry.organization_id) if entry.organization_id else None,
        "action": entry.action,
        "resource_type": entry.resource_type,
        "resource_id": str(entry.resource_id) if entry.resource_id else None,
        "ip": str(entry.ip) if entry.ip is not None else None,
        "user_agent": entry.user_agent,
        "diff": entry.diff,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


def compute_record_hash(prev_hash: str, payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256((prev_hash + canonical).encode()).hexdigest()


async def latest_record_hash(db: AsyncSession) -> str:
    stmt = (
        select(AuditLog.record_hash)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(1)
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    return row or GENESIS_HASH


def seal_audit_entry(entry: AuditLog, prev_hash: str) -> str:
    """Set prev_hash and record_hash on entry; return record_hash."""
    payload = canonical_audit_payload(entry)
    record_hash = compute_record_hash(prev_hash, payload)
    entry.prev_hash = prev_hash
    entry.record_hash = record_hash
    return record_hash


async def append_audit_chain(db: AsyncSession, entry: AuditLog) -> str:
    prev_hash = await latest_record_hash(db)
    return seal_audit_entry(entry, prev_hash)


def compute_daily_root(record_hashes: list[str]) -> str:
    if not record_hashes:
        return hashlib.sha256(b"").hexdigest()
    joined = "".join(record_hashes)
    return hashlib.sha256(joined.encode()).hexdigest()


async def verify_audit_chain(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID | None = None,
    limit: int | None = None,
) -> dict[str, Any]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
    if organization_id is not None:
        stmt = stmt.where(AuditLog.organization_id == organization_id)
    if limit is not None:
        stmt = stmt.limit(limit)

    rows = list((await db.execute(stmt)).scalars().all())
    if not rows:
        return {"valid": True, "checked": 0, "broken_at": None}

    expected_prev = GENESIS_HASH
    for idx, row in enumerate(rows):
        if row.prev_hash != expected_prev:
            return {
                "valid": False,
                "checked": idx,
                "broken_at": str(row.id),
                "reason": "prev_hash_mismatch",
            }
        payload = canonical_audit_payload(row)
        expected_record = compute_record_hash(expected_prev, payload)
        if row.record_hash != expected_record:
            return {
                "valid": False,
                "checked": idx,
                "broken_at": str(row.id),
                "reason": "record_hash_mismatch",
            }
        expected_prev = row.record_hash

    return {"valid": True, "checked": len(rows), "broken_at": None, "tip_hash": expected_prev}


async def build_daily_root(
    db: AsyncSession,
    *,
    chain_date: date | None = None,
) -> AuditChainRoot:
    target = chain_date or (datetime.now(UTC).date() - timedelta(days=1))
    start = datetime.combine(target, datetime.min.time(), tzinfo=UTC)
    end = start + timedelta(days=1)

    stmt = (
        select(AuditLog.record_hash)
        .where(AuditLog.created_at >= start, AuditLog.created_at < end)
        .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
    )
    hashes = list((await db.execute(stmt)).scalars().all())
    root_hash = compute_daily_root(hashes)

    existing = (
        await db.execute(select(AuditChainRoot).where(AuditChainRoot.chain_date == target))
    ).scalar_one_or_none()
    if existing is not None:
        existing.root_hash = root_hash
        existing.record_count = len(hashes)
        return existing

    root = AuditChainRoot(
        chain_date=target,
        root_hash=root_hash,
        record_count=len(hashes),
    )
    db.add(root)
    return root


async def publish_daily_root(db: AsyncSession, root: AuditChainRoot) -> str | None:
    payload = {
        "chain_date": root.chain_date.isoformat(),
        "root_hash": root.root_hash,
        "record_count": root.record_count,
        "published_at": datetime.now(UTC).isoformat(),
        "genesis_hash": GENESIS_HASH,
    }
    body = json.dumps(payload, indent=2).encode()
    key = f"{TRANSPARENCY_PREFIX}/{root.chain_date.isoformat()}.json"
    storage = get_storage()
    if not storage.is_available():
        root.published_at = datetime.now(UTC)
        return None
    storage.put_bytes(key, body, content_type="application/json")
    root.s3_key = key
    root.published_at = datetime.now(UTC)
    return key


async def run_daily_audit_root_publish(db: AsyncSession) -> dict[str, Any]:
    root = await build_daily_root(db)
    s3_key = await publish_daily_root(db, root)
    await db.commit()
    return {
        "chain_date": root.chain_date.isoformat(),
        "root_hash": root.root_hash,
        "record_count": root.record_count,
        "s3_key": s3_key,
    }


async def chain_stats(db: AsyncSession) -> dict[str, Any]:
    total = (await db.execute(select(func.count()).select_from(AuditLog))).scalar_one()
    tip = await latest_record_hash(db)
    return {"total_records": total, "tip_hash": tip if total else GENESIS_HASH}
