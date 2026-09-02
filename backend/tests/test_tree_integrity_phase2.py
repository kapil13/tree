"""Phase 2 integrity tests: fusion scores and credit gating."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.integrity.credit_gating import (
    ISSUED_MIN_AUDIT_READY_PCT,
    VERIFIED_MIN_ELIGIBLE_PCT,
    assert_credit_transition_allowed,
    project_integrity_summary,
)
from app.services.integrity.fusion import (
    FUSION_CREDIT_MIN_SCORE,
    FUSION_ISSUE_MIN_SCORE,
    compute_ai_score,
    compute_field_score,
    compute_fusion_score,
    compute_satellite_score,
    compute_tree_fusion,
    resolve_credit_eligible,
)
from app.services.integrity.tree_risk import RiskAssessment


def _assessment(**kwargs) -> RiskAssessment:
    defaults = {
        "gps_photo_match": True,
        "duplicate_photo": False,
        "duplicate_coordinate": False,
        "ai_confidence_low": False,
        "regeotag_mismatch": False,
        "composite_risk": 0.1,
        "details": {},
    }
    defaults.update(kwargs)
    return RiskAssessment(**defaults)


def test_compute_field_score_good_evidence():
    score = compute_field_score(_assessment(composite_risk=0.1, gps_photo_match=True))
    assert score >= 80


def test_compute_field_score_duplicate_penalty():
    base = compute_field_score(_assessment(duplicate_photo=False))
    penalized = compute_field_score(_assessment(duplicate_photo=True))
    assert penalized < base - 25


def test_compute_satellite_score_with_ndvi():
    score = compute_satellite_score(
        satellite_verified=True,
        ndvi_mean=0.45,
        presence_confirmed=True,
        change_vs_baseline=0.08,
        work_area_ndvi_baseline=0.3,
    )
    assert score >= 70


def test_compute_satellite_score_no_data():
    score = compute_satellite_score(
        satellite_verified=False,
        ndvi_mean=None,
        presence_confirmed=None,
        change_vs_baseline=None,
    )
    assert score == 35.0


def test_compute_ai_score():
    assert compute_ai_score(None) == 50.0
    assert compute_ai_score(0.82) == 82.0


def test_compute_fusion_score_with_ai():
    fusion = compute_fusion_score(
        field_score=80.0,
        satellite_score=70.0,
        ai_score=90.0,
        has_ai=True,
    )
    assert fusion == pytest.approx(0.45 * 80 + 0.35 * 70 + 0.20 * 90, rel=0.01)


def test_compute_fusion_score_without_ai():
    fusion = compute_fusion_score(
        field_score=80.0,
        satellite_score=70.0,
        ai_score=50.0,
        has_ai=False,
    )
    assert fusion == pytest.approx(0.55 * 80 + 0.45 * 70, rel=0.01)


def test_resolve_credit_eligible_requires_verification():
    assessment = _assessment()
    assert (
        resolve_credit_eligible(
            fusion_score=80.0,
            assessment=assessment,
            verification_status="registered",
        )
        is False
    )
    assert (
        resolve_credit_eligible(
            fusion_score=80.0,
            assessment=assessment,
            verification_status="field_verified",
        )
        is True
    )


def test_resolve_credit_eligible_blocks_duplicates():
    assessment = _assessment(duplicate_photo=True)
    assert (
        resolve_credit_eligible(
            fusion_score=90.0,
            assessment=assessment,
            verification_status="field_verified",
        )
        is False
    )


def test_resolve_credit_eligible_min_fusion_score():
    assessment = _assessment()
    assert (
        resolve_credit_eligible(
            fusion_score=FUSION_CREDIT_MIN_SCORE - 1,
            assessment=assessment,
            verification_status="field_verified",
        )
        is False
    )


def test_compute_tree_fusion_end_to_end():
    tree = SimpleNamespace(satellite_verified=True)
    result = compute_tree_fusion(
        tree,
        _assessment(),
        ndvi_mean=0.5,
        presence_confirmed=True,
        change_vs_baseline=0.1,
        work_area_ndvi_baseline=0.35,
        overall_confidence=0.85,
        verification_status="field_verified",
    )
    assert result.fusion_score >= FUSION_CREDIT_MIN_SCORE
    assert result.credit_eligible is True
    assert "weights" in result.details


@pytest.mark.asyncio
async def test_project_integrity_summary_empty():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
    summary = await project_integrity_summary(db, uuid.uuid4())
    assert summary.passed is False
    assert summary.tree_count == 0


@pytest.mark.asyncio
async def test_project_integrity_summary_passes_at_threshold():
    project_id = uuid.uuid4()
    rows = []
    for i in range(10):
        tree = SimpleNamespace(
            public_code=f"T-{i}",
            verification_status="field_verified",
        )
        risk = SimpleNamespace(
            fusion_score=75.0,
            credit_eligible=True,
        )
        rows.append((tree, risk))
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    summary = await project_integrity_summary(db, project_id)
    assert summary.tree_count == 10
    assert summary.credit_eligible_count == 10
    assert summary.passed is True
    assert summary.avg_fusion_score == 75.0


@pytest.mark.asyncio
async def test_project_integrity_summary_fails_below_threshold():
    rows = []
    for i in range(10):
        tree = SimpleNamespace(
            public_code=f"T-{i}",
            verification_status="registered",
        )
        eligible = i < 7  # 70% eligible
        risk = SimpleNamespace(
            fusion_score=70.0 if eligible else 40.0,
            credit_eligible=eligible,
        )
        rows.append((tree, risk))
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    summary = await project_integrity_summary(db, uuid.uuid4())
    assert summary.credit_eligible_count == 7
    assert summary.passed is False


@pytest.mark.asyncio
async def test_assert_credit_transition_verified_passes():
    rows = [
        (
            SimpleNamespace(public_code="T-1", verification_status="field_verified"),
            SimpleNamespace(fusion_score=80.0, credit_eligible=True),
        )
        for _ in range(5)
    ]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="verified")


@pytest.mark.asyncio
async def test_assert_credit_transition_verified_fails():
    rows = [
        (
            SimpleNamespace(public_code="T-1", verification_status="registered"),
            SimpleNamespace(fusion_score=50.0, credit_eligible=False),
        )
        for _ in range(5)
    ]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    with pytest.raises(ValueError, match="integrity_gate_failed:verified"):
        await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="verified")


@pytest.mark.asyncio
async def test_assert_credit_transition_issued_requires_audit_ready():
    rows = []
    for i in range(10):
        tree = SimpleNamespace(
            public_code=f"T-{i}",
            verification_status="audit_ready" if i < 8 else "field_verified",
        )
        risk = SimpleNamespace(fusion_score=80.0, credit_eligible=True)
        rows.append((tree, risk))
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    with pytest.raises(ValueError, match="integrity_gate_failed:issued"):
        await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="issued")

    # 9/10 audit_ready meets the 90% issued gate
    rows[8] = (
        SimpleNamespace(public_code="T-8", verification_status="audit_ready"),
        SimpleNamespace(fusion_score=80.0, credit_eligible=True),
    )
    await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="issued")


def test_fusion_threshold_constants():
    assert FUSION_CREDIT_MIN_SCORE == 65.0
    assert FUSION_ISSUE_MIN_SCORE == 75.0
    assert VERIFIED_MIN_ELIGIBLE_PCT == 80.0
    assert ISSUED_MIN_AUDIT_READY_PCT == 90.0
