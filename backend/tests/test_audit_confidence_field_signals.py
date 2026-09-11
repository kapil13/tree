"""Tests for Sprint 3 field-signal confidence fusion and reconciliation."""

from __future__ import annotations

from app.services.audit_confidence.field_signals import derive_field_grade
from app.services.audit_confidence.fusion import GRADE_GREEN, GRADE_RED, fuse_block_confidence
from app.services.audit_export.reconciliation import _grades_aligned


def test_derive_field_grade_positive():
    grade, signal = derive_field_grade(
        visit_count=2,
        tree_presence_counts={"present": 2},
        outcome_counts={"claim_supported": 2},
    )
    assert grade == "green"
    assert signal == "field_positive"


def test_derive_field_grade_negative():
    grade, signal = derive_field_grade(
        visit_count=1,
        tree_presence_counts={"absent": 1},
        outcome_counts={"claim_unsupported": 1},
    )
    assert grade == "red"
    assert signal == "field_negative"


def test_fuse_with_field_signals_boosts_score():
    base = fuse_block_confidence(
        block_name="A",
        plausibility_verdict="plausible",
        plausibility_signals={},
        gis_status="pass",
        gis_block_issues=[],
        t0_backfill_status="found",
        t0_ndvi=0.35,
        current_ndvi=0.4,
        change_vs_t0=0.05,
        sar_integrity_score=None,
    )
    with_field = fuse_block_confidence(
        block_name="A",
        plausibility_verdict="plausible",
        plausibility_signals={},
        gis_status="pass",
        gis_block_issues=[],
        t0_backfill_status="found",
        t0_ndvi=0.35,
        current_ndvi=0.4,
        change_vs_t0=0.05,
        sar_integrity_score=None,
        field_visit_count=3,
        field_grade=GRADE_GREEN,
        field_signal="field_positive",
    )
    assert with_field["confidence_score"] > base["confidence_score"]
    assert with_field["signals"]["field_grade"] == GRADE_GREEN


def test_fuse_with_negative_field_signals():
    base = fuse_block_confidence(
        block_name="B",
        plausibility_verdict="plausible",
        plausibility_signals={},
        gis_status="pass",
        gis_block_issues=[],
        t0_backfill_status="found",
        t0_ndvi=0.35,
        current_ndvi=0.4,
        change_vs_t0=0.05,
        sar_integrity_score=None,
    )
    with_field = fuse_block_confidence(
        block_name="B",
        plausibility_verdict="plausible",
        plausibility_signals={},
        gis_status="pass",
        gis_block_issues=[],
        t0_backfill_status="found",
        t0_ndvi=0.35,
        current_ndvi=0.4,
        change_vs_t0=0.05,
        sar_integrity_score=None,
        field_visit_count=2,
        field_grade=GRADE_RED,
        field_signal="field_negative",
    )
    assert with_field["confidence_score"] < base["confidence_score"]
    assert with_field["signals"]["field_signal"] == "field_negative"


def test_grades_aligned_adjacent():
    assert _grades_aligned("green", "amber") is True
    assert _grades_aligned("green", "red") is False
    assert _grades_aligned("red", "red") is True
