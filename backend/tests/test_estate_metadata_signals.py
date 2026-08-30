"""Tests for estate monitoring auto-signals."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.mark.asyncio
async def test_estate_metadata_complete_signal(monkeypatch):
    from app.services.compliance.evaluator import build_auto_signals

    refs = {
        "estate_name": "Kumbhalgarh Block C",
        "managing_agency": "Rajasthan FD",
        "state_name": "Rajasthan",
        "forest_type": "natural_forest",
        "total_area_ha": 120,
        "baseline_year": 2024,
        "monitoring_objective": "health_watch",
    }
    project = SimpleNamespace(
        id=uuid.uuid4(),
        scheme_code="estate_monitoring",
        metadata_={"scheme_refs": refs},
    )
    db = AsyncMock()

    empty_trees = MagicMock()
    empty_trees.scalars.return_value.all.return_value = []
    empty_violations = MagicMock()
    empty_violations.scalars.return_value.all.return_value = []
    count_zero = MagicMock()
    count_zero.scalar_one.return_value = 0
    fences_empty = MagicMock()
    fences_empty.scalars.return_value.all.return_value = []
    ledger_none = MagicMock()
    ledger_none.scalar_one_or_none.return_value = None
    risk_none = MagicMock()
    risk_none.scalar_one_or_none.return_value = None
    serial_empty = MagicMock()
    serial_empty.scalars.return_value.all.return_value = []
    sar_empty = MagicMock()
    sar_empty.scalars.return_value.all.return_value = []

    async def fake_standard(db_, proj):
        return SimpleNamespace(id=uuid.uuid4())

    monkeypatch.setattr(
        "app.services.compliance.evaluator.get_active_standard",
        fake_standard,
    )
    monkeypatch.setattr("app.services.carbon.vm0047_ops.list_leakage", AsyncMock(return_value=[]))
    monkeypatch.setattr(
        "app.services.compliance.safeguards.safeguard_doc_types_present",
        AsyncMock(return_value=set()),
    )

    db.execute = AsyncMock(
        side_effect=[
            empty_trees,
            empty_violations,
            count_zero,
            fences_empty,
            ledger_none,
            risk_none,
            serial_empty,
            sar_empty,
        ]
    )

    signals = await build_auto_signals(db, project)
    assert signals["estate_metadata_complete"] == "yes"
