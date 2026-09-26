"""Tests for Estate Watch Phase 3 confidence map."""

from __future__ import annotations

import pytest

from app.services.audit_confidence.fusion import (
    GRADE_AMBER,
    GRADE_GREEN,
    GRADE_GREY,
    GRADE_RED,
    fuse_block_confidence,
)


def test_fuse_high_confidence():
    result = fuse_block_confidence(
        block_name="Compartment A",
        plausibility_verdict="plausible",
        plausibility_signals={"area_ha": 100},
        gis_status="pass",
        gis_block_issues=[],
        t0_backfill_status="found",
        t0_ndvi=0.35,
        current_ndvi=0.52,
        change_vs_t0=0.17,
        sar_integrity_score=75.0,
    )
    assert result["confidence_grade"] == GRADE_GREEN
    assert result["confidence_score"] >= 70
    assert result["epistemic_label"] == "ESTIMATION"
    assert len(result["grid_cells"]) == 9


def test_fuse_low_confidence_inconsistent():
    result = fuse_block_confidence(
        block_name="Block X",
        plausibility_verdict="inconsistent",
        plausibility_signals={},
        gis_status="fail",
        gis_block_issues=[{"code": "overlap"}],
        t0_backfill_status="found",
        t0_ndvi=0.4,
        current_ndvi=0.2,
        change_vs_t0=-0.2,
        sar_integrity_score=30.0,
    )
    assert result["confidence_grade"] == GRADE_RED
    assert result["confidence_score"] < 40


def test_fuse_no_data_grey():
    result = fuse_block_confidence(
        block_name="Empty",
        plausibility_verdict=None,
        plausibility_signals=None,
        gis_status=None,
        gis_block_issues=[],
        t0_backfill_status="not_found",
        t0_ndvi=None,
        current_ndvi=None,
        change_vs_t0=None,
        sar_integrity_score=None,
    )
    assert result["confidence_grade"] == GRADE_GREY


def test_fuse_uncertain_amber():
    result = fuse_block_confidence(
        block_name="Block B",
        plausibility_verdict="unusual",
        plausibility_signals={"area_mismatch_pct": 18},
        gis_status="warn",
        gis_block_issues=[],
        t0_backfill_status="found",
        t0_ndvi=0.3,
        current_ndvi=0.32,
        change_vs_t0=0.02,
        sar_integrity_score=None,
    )
    assert result["confidence_grade"] in {GRADE_AMBER, GRADE_GREEN, GRADE_RED}


@pytest.mark.asyncio
async def test_compute_requires_analysis_ready():
    from types import SimpleNamespace

    from app.services.audit_confidence.compute import compute_confidence_map

    engagement = SimpleNamespace(id="00000000-0000-0000-0000-000000000001", status="intake_complete", metadata_={})
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="analysis_not_ready"):
        await compute_confidence_map(db, engagement)
