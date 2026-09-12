"""P1 production readiness — carbon recalc, bioacoustic fence scoping."""

from __future__ import annotations

import uuid
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.tree import TreeUpdate


@pytest.mark.asyncio
async def test_update_tree_schedules_carbon_recalc_on_species_change():
    from app.api.v1.trees import update_tree

    tree_id = uuid.uuid4()
    user = MagicMock(id=uuid.uuid4(), role="government", organization_id=uuid.uuid4())
    tree = SimpleNamespace(
        id=tree_id,
        public_code="T-001",
        species_id=None,
        species_text="Neem",
        planted_at=date(2024, 1, 1),
        status="active",
        metadata_=None,
        current_carbon_kg=10.0,
    )
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with (
        patch("app.api.v1.trees._get_owned_tree", new=AsyncMock(return_value=tree)),
        patch("app.api.v1.trees.record_audit", new=AsyncMock()),
        patch("app.api.v1.trees._to_out", side_effect=lambda t: t),
        patch(
            "app.services.carbon.recalc_ops.schedule_tree_carbon_recalc",
            new=AsyncMock(),
        ) as mock_recalc,
    ):
        await update_tree(
            tree_id,
            TreeUpdate(species_text="Mango"),
            request=MagicMock(),
            user=user,
            db=db,
        )

    mock_recalc.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_tree_skips_carbon_recalc_for_metadata_only():
    from app.api.v1.trees import update_tree

    tree_id = uuid.uuid4()
    user = MagicMock(id=uuid.uuid4(), role="government", organization_id=uuid.uuid4())
    tree = SimpleNamespace(
        id=tree_id,
        public_code="T-001",
        species_id=None,
        species_text="Neem",
        planted_at=date(2024, 1, 1),
        status="active",
        metadata_={},
        current_carbon_kg=10.0,
    )
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with (
        patch("app.api.v1.trees._get_owned_tree", new=AsyncMock(return_value=tree)),
        patch("app.api.v1.trees.record_audit", new=AsyncMock()),
        patch("app.api.v1.trees._to_out", side_effect=lambda t: t),
        patch(
            "app.services.carbon.recalc_ops.schedule_tree_carbon_recalc",
            new=AsyncMock(),
        ) as mock_recalc,
    ):
        await update_tree(
            tree_id,
            TreeUpdate(metadata={"note": "surveyed"}),
            request=MagicMock(),
            user=user,
            db=db,
        )

    mock_recalc.assert_not_awaited()


@pytest.mark.asyncio
async def test_bioacoustic_load_fence_uses_work_area():
    from app.api.v1.bioacoustic import _load_fence_for_user

    fence_id = uuid.uuid4()
    user = MagicMock(role="user")
    db = AsyncMock()
    fence = MagicMock(id=fence_id)

    with patch(
        "app.services.planting_projects.access.load_work_area",
        new=AsyncMock(return_value=fence),
    ) as mock_load:
        result = await _load_fence_for_user(fence_id, user, db)

    mock_load.assert_awaited_once_with(fence_id, user, db)
    assert result is fence


@pytest.mark.asyncio
async def test_bioacoustic_load_fence_not_found():
    from fastapi import HTTPException

    from app.api.v1.bioacoustic import _load_fence_for_user

    with patch(
        "app.services.planting_projects.access.load_work_area",
        new=AsyncMock(return_value=None),
    ):
        with pytest.raises(HTTPException) as exc:
            await _load_fence_for_user(uuid.uuid4(), MagicMock(), AsyncMock())
    assert exc.value.status_code == 404
