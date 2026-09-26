"""Phase 5a: integrity backfill and ledger-sync refresh tests."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.credits.ledger import sync_project_ledger
from app.services.integrity.project_refresh import (
    backfill_integrity_fusion,
    maybe_refresh_integrity_before_ledger,
    project_ids_needing_integrity_refresh,
)


@pytest.mark.asyncio
async def test_project_ids_needing_integrity_refresh():
    project_id = uuid.uuid4()
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[project_id]))))
    )
    ids = await project_ids_needing_integrity_refresh(db, limit=10)
    assert ids == [project_id]


@pytest.mark.asyncio
async def test_backfill_integrity_fusion_processes_projects():
    project_id = uuid.uuid4()
    db = AsyncMock()
    with patch(
        "app.services.integrity.project_refresh.refresh_project_integrity",
        new_callable=AsyncMock,
        return_value={"refreshed_count": 4, "tree_count": 4},
    ) as mock_refresh:
        result = await backfill_integrity_fusion(db, project_ids=[project_id])
    assert result["projects_processed"] == 1
    assert result["trees_refreshed"] == 4
    mock_refresh.assert_awaited_once_with(db, project_id)


@pytest.mark.asyncio
async def test_maybe_refresh_integrity_before_ledger_skips_when_disabled():
    project = SimpleNamespace(id=uuid.uuid4())
    db = AsyncMock()
    result = await maybe_refresh_integrity_before_ledger(db, project, refresh_integrity=False)
    assert result is None
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_sync_project_ledger_refreshes_integrity_by_default():
    project = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        status="active",
    )
    ledger = SimpleNamespace(
        id=uuid.uuid4(),
        status="estimated",
        organization_id=project.organization_id,
        methodology="VERRA_VM0047",
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
    )
    db.flush = AsyncMock()

    with (
        patch(
            "app.services.integrity.project_refresh.maybe_refresh_integrity_before_ledger",
            new_callable=AsyncMock,
            return_value={"refreshed_count": 0},
        ) as mock_refresh,
        patch(
            "app.services.credits.ledger.get_or_create_ledger",
            new_callable=AsyncMock,
            return_value=ledger,
        ),
        patch(
            "app.services.credits.ledger.latest_risk_assessment",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        await sync_project_ledger(db, project)
    mock_refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_sync_project_ledger_skips_integrity_when_disabled():
    project = SimpleNamespace(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
    )
    ledger = SimpleNamespace(
        id=uuid.uuid4(),
        status="estimated",
        organization_id=project.organization_id,
        methodology="VERRA_VM0047",
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
    )
    db.flush = AsyncMock()

    with (
        patch(
            "app.services.integrity.project_refresh.maybe_refresh_integrity_before_ledger",
            new_callable=AsyncMock,
        ) as mock_refresh,
        patch(
            "app.services.credits.ledger.get_or_create_ledger",
            new_callable=AsyncMock,
            return_value=ledger,
        ),
        patch(
            "app.services.credits.ledger.latest_risk_assessment",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        await sync_project_ledger(db, project, refresh_integrity=False)
    mock_refresh.assert_not_called()
