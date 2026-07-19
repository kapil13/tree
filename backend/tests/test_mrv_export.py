"""Tests for MRV export context builder."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.services.planting_projects.mrv_export import build_project_mrv_context


def test_build_project_mrv_context_empty_project(monkeypatch):
    project = SimpleNamespace(
        code="NHAI-01",
        name="Test Highway",
        segment="highway",
        compliance_mode="strict",
        status="active",
        target_tree_count=100,
        id="00000000-0000-0000-0000-000000000001",
    )

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=0)
    db.execute = AsyncMock(
        return_value=MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        )
    )

    monkeypatch.setattr(
        "app.services.planting_projects.mrv_export.get_active_standard",
        AsyncMock(return_value=None),
    )

    ctx = asyncio.run(build_project_mrv_context(db, project))

    assert ctx["project"]["code"] == "NHAI-01"
    assert ctx["summary"]["tree_count"] == 0
    assert ctx["summary"]["open_violations"] == 0
    assert ctx["work_areas"] == []
    assert ctx["trees"] == []
