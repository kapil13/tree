"""Async-safe integrity helpers used during tree registration."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.integrity.tree_risk import (
    RiskAssessment,
    apply_integrity_to_tree,
    persist_tree_risk_score,
)


def _sample_assessment() -> RiskAssessment:
    return RiskAssessment(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=0.1,
        details={},
    )


@pytest.mark.asyncio
async def test_persist_tree_risk_score_queries_db_when_relationship_not_loaded():
    tree_id = uuid.uuid4()
    tree = MagicMock()
    tree.id = tree_id
    tree.__dict__ = {"id": tree_id}

    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    db.add = MagicMock()
    db.flush = AsyncMock()

    row = await persist_tree_risk_score(db, tree=tree, assessment=_sample_assessment())

    db.execute.assert_awaited_once()
    db.add.assert_called_once()
    assert row.tree_id == tree_id


@pytest.mark.asyncio
async def test_apply_integrity_to_tree_uses_passed_images_without_lazy_load():
    tree_id = uuid.uuid4()

    class _Tree:
        id = tree_id
        plantation_id = None
        satellite_verified = False
        verification_status = "registered"

    tree = _Tree()
    image = MagicMock()
    image.is_primary = True
    image.taken_at = None

    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    db.add = MagicMock()
    db.flush = AsyncMock()

    await apply_integrity_to_tree(
        db,
        tree,  # type: ignore[arg-type]
        _sample_assessment(),
        images=[image],
    )

    db.flush.assert_awaited()
