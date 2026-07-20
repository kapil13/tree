"""Tests for audit trail service."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.audit.log import record_audit


@pytest.mark.asyncio
async def test_record_audit_adds_entry_with_actor():
    db = AsyncMock()
    actor = MagicMock()
    actor.id = uuid.uuid4()
    actor.organization_id = uuid.uuid4()

    entry = await record_audit(
        db,
        actor=actor,
        action="tree.create",
        resource_type="tree",
        resource_id=uuid.uuid4(),
        diff={"public_code": "BYOT-TEST-0001"},
        ip="127.0.0.1",
        user_agent="pytest",
    )

    db.add.assert_called_once()
    assert entry.action == "tree.create"
    assert entry.actor_user_id == actor.id
    assert entry.organization_id == actor.organization_id
    assert entry.diff["public_code"] == "BYOT-TEST-0001"
