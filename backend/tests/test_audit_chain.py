"""Tests for hash-chained audit log."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.audit import AuditLog
from app.services.audit.chain import (
    GENESIS_HASH,
    append_audit_chain,
    canonical_audit_payload,
    compute_daily_root,
    compute_record_hash,
    seal_audit_entry,
    verify_audit_chain,
)


def _entry(**kwargs) -> AuditLog:
    defaults = {
        "id": uuid.uuid4(),
        "actor_user_id": uuid.uuid4(),
        "organization_id": uuid.uuid4(),
        "action": "tree.create",
        "resource_type": "tree",
        "resource_id": uuid.uuid4(),
        "ip": "127.0.0.1",
        "user_agent": "pytest",
        "diff": {"k": "v"},
        "created_at": datetime.now(UTC),
        "prev_hash": GENESIS_HASH,
        "record_hash": "0" * 64,
    }
    defaults.update(kwargs)
    return AuditLog(**defaults)


def test_compute_record_hash_is_deterministic():
    payload = {"action": "test", "id": "abc"}
    h1 = compute_record_hash(GENESIS_HASH, payload)
    h2 = compute_record_hash(GENESIS_HASH, payload)
    assert h1 == h2
    assert len(h1) == 64


def test_seal_audit_entry_links_to_prev():
    entry = _entry()
    record_hash = seal_audit_entry(entry, GENESIS_HASH)
    assert entry.prev_hash == GENESIS_HASH
    assert entry.record_hash == record_hash
    expected = compute_record_hash(GENESIS_HASH, canonical_audit_payload(entry))
    assert record_hash == expected


@pytest.mark.asyncio
async def test_verify_audit_chain_detects_tampering():
    e1 = _entry(action="a1")
    seal_audit_entry(e1, GENESIS_HASH)
    e2 = _entry(action="a2")
    seal_audit_entry(e2, e1.record_hash)
    e2.record_hash = "f" * 64  # tamper

    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: [e1, e2]))))

    result = await verify_audit_chain(db)
    assert result["valid"] is False
    assert result["reason"] == "record_hash_mismatch"


def test_daily_root_empty():
    assert compute_daily_root([]) == hashlib.sha256(b"").hexdigest()


@pytest.mark.asyncio
async def test_append_audit_chain_uses_latest():
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value="abc" * 21 + "a"))
    )
    entry = _entry()
    record_hash = await append_audit_chain(db, entry)
    assert entry.prev_hash == "abc" * 21 + "a"
    assert entry.record_hash == record_hash
