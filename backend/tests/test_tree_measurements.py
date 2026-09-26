"""Tree measurement time-series tests."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.tree import Tree
from app.models.tree_measurement import TreeMeasurement
from app.schemas.tree_measurement import TreeMeasurementCreate
from app.services.trees.measurements import (
    create_measurement,
    default_uncertainty,
    sync_tree_current_from_latest,
)


def test_default_uncertainty_tape():
    dbh, height = default_uncertainty("tape")
    assert dbh == 2.0
    assert height == 5.0


def test_default_uncertainty_unknown_method():
    dbh, height = default_uncertainty("unknown")
    assert dbh is None
    assert height is None


@pytest.mark.asyncio
async def test_sync_tree_current_from_latest_updates_cached_fields():
    tree = Tree(
        id=uuid4(),
        public_code="BYOT-TEST-0001",
        owner_user_id=uuid4(),
        location="POINT(0 0)",
    )
    latest = TreeMeasurement(
        id=uuid4(),
        tree_id=tree.id,
        measured_at=datetime.now(UTC),
        source="field_survey",
        method="tape",
        dbh_cm=12.5,
        height_m=3.4,
        canopy_m=2.1,
    )
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = latest
    db.execute = AsyncMock(return_value=result)

    await sync_tree_current_from_latest(db, tree)

    assert float(tree.current_dbh_cm) == 12.5
    assert float(tree.current_height_m) == 3.4
    assert float(tree.current_canopy_m) == 2.1


@pytest.mark.asyncio
async def test_create_measurement_applies_default_uncertainty():
    tree = Tree(
        id=uuid4(),
        public_code="BYOT-TEST-0002",
        owner_user_id=uuid4(),
        location="POINT(0 0)",
    )
    measurer_id = uuid4()
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    none_result = MagicMock()
    none_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=none_result)

    payload = TreeMeasurementCreate(
        source="field_survey",
        method="caliper",
        dbh_cm=10.0,
        height_m=2.5,
    )
    row = await create_measurement(db, tree=tree, payload=payload, measurer_id=measurer_id)

    assert row.method == "caliper"
    assert float(row.uncertainty_dbh_pct) == 1.0
    assert float(row.uncertainty_height_pct) == 5.0
    assert row.measurer_id == measurer_id
    db.add.assert_called_once()
