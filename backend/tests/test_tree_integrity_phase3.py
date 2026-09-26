"""Phase 3 integrity tests: project refresh and gate detail."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.integrity.credit_gating import (
    IntegrityGateError,
    assert_credit_transition_allowed,
    integrity_gate_detail,
)
from app.services.integrity.project_refresh import refresh_project_integrity


@pytest.mark.asyncio
async def test_integrity_gate_detail_empty_project():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
    detail = await integrity_gate_detail(db, uuid.uuid4())
    assert detail["tree_count"] == 0
    assert detail["verified_ready"] is False
    assert detail["issued_ready"] is False


@pytest.mark.asyncio
async def test_integrity_gate_detail_blocking_reasons():
    tree = SimpleNamespace(
        id=uuid.uuid4(),
        public_code="T-001",
        verification_status="registered",
    )
    risk = SimpleNamespace(
        fusion_score=50.0,
        credit_eligible=False,
        duplicate_photo=False,
        duplicate_coordinate=False,
        composite_risk=0.1,
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[(tree, risk)])))
    detail = await integrity_gate_detail(db, uuid.uuid4())
    assert detail["tree_count"] == 1
    assert detail["credit_eligible_count"] == 0
    assert len(detail["blocking_trees"]) == 1
    assert "not_field_verified" in detail["blocking_trees"][0]["reasons"]
    assert "fusion_below_minimum" in detail["blocking_trees"][0]["reasons"]


@pytest.mark.asyncio
async def test_assert_credit_transition_raises_integrity_gate_error():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
    with pytest.raises(IntegrityGateError, match="integrity_gate_failed:no_trees"):
        await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="verified")


@pytest.mark.asyncio
async def test_refresh_project_integrity_counts_trees():
    project_id = uuid.uuid4()
    trees = [SimpleNamespace(id=uuid.uuid4()) for _ in range(3)]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=trees)))))
    with (
        patch(
            "app.services.integrity.project_refresh.refresh_tree_integrity",
            new_callable=AsyncMock,
        ) as mock_refresh,
        patch(
            "app.services.integrity.project_refresh.project_fusion_stats",
            new_callable=AsyncMock,
            return_value={"tree_count": 3, "credit_eligible_count": 2},
        ),
    ):
        result = await refresh_project_integrity(db, project_id)
    assert result["refreshed_count"] == 3
    assert mock_refresh.await_count == 3
