"""P0 anti-fraud hardening tests: audit-ready rules and monitoring gates."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.integrity.audit_readiness import (
    MAX_SATELLITE_AGE_DAYS,
    MIN_PHOTO_SPAN_DAYS,
    audit_ready_blockers,
    has_sufficient_photo_evidence,
    meets_audit_ready_criteria,
    photo_span_days,
    satellite_scan_within_days,
)
from app.services.integrity.credit_gating import (
    IntegrityGateError,
    assert_credit_transition_allowed,
)
from app.services.integrity.monitoring_gate import (
    VERIFIED_MAX_OPTICAL_STALE_DAYS,
    VERIFIED_MIN_SAR_INTEGRITY,
    project_monitoring_gate,
)
from app.services.integrity.tree_risk import (
    RiskAssessment,
    resolve_audit_ready_status,
    resolve_verification_status,
)


def _image(taken_at: datetime) -> SimpleNamespace:
    return SimpleNamespace(taken_at=taken_at, created_at=taken_at)


def test_photo_span_days_requires_two_photos():
    now = datetime.now(UTC)
    assert photo_span_days([_image(now)]) is None
    images = [_image(now - timedelta(days=45)), _image(now)]
    assert photo_span_days(images) == pytest.approx(45.0, abs=0.1)


def test_has_sufficient_photo_evidence():
    now = datetime.now(UTC)
    assert has_sufficient_photo_evidence([_image(now)]) is False
    images = [_image(now - timedelta(days=MIN_PHOTO_SPAN_DAYS)), _image(now)]
    assert has_sufficient_photo_evidence(images) is True


def test_satellite_scan_within_days():
    now = datetime.now(UTC)
    assert satellite_scan_within_days(now - timedelta(days=30)) is True
    assert satellite_scan_within_days(now - timedelta(days=MAX_SATELLITE_AGE_DAYS + 1)) is False
    assert satellite_scan_within_days(None) is False


def test_audit_ready_blockers_all_clear():
    now = datetime.now(UTC)
    images = [_image(now - timedelta(days=40)), _image(now)]
    assert audit_ready_blockers(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=10),
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
    ) == []


def test_audit_ready_blockers_duplicate_photo():
    now = datetime.now(UTC)
    images = [_image(now - timedelta(days=40)), _image(now)]
    reasons = audit_ready_blockers(
        duplicate_photo=True,
        duplicate_coordinate=False,
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=10),
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
    )
    assert "duplicate_photo" in reasons


def test_audit_ready_blockers_fusion_too_low():
    now = datetime.now(UTC)
    images = [_image(now - timedelta(days=40)), _image(now)]
    reasons = audit_ready_blockers(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=10),
        fusion_score=70.0,
        base_verification_status="satellite_corroborated",
    )
    assert "fusion_below_audit_minimum" in reasons


def test_resolve_verification_status_satellite_corroborated_not_audit_ready():
    assessment = RiskAssessment(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=0.1,
        details={},
    )
    assert (
        resolve_verification_status(assessment, satellite_verified=True)
        == "satellite_corroborated"
    )


def test_resolve_audit_ready_status_promotes_when_eligible():
    now = datetime.now(UTC)
    assessment = RiskAssessment(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=0.1,
        details={},
    )
    images = [_image(now - timedelta(days=40)), _image(now)]
    status = resolve_audit_ready_status(
        assessment,
        base_verification_status="satellite_corroborated",
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=10),
        fusion_score=80.0,
    )
    assert status == "audit_ready"


def test_resolve_audit_ready_status_stays_satellite_when_photo_span_short():
    now = datetime.now(UTC)
    assessment = RiskAssessment(
        gps_photo_match=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        ai_confidence_low=False,
        regeotag_mismatch=False,
        composite_risk=0.1,
        details={},
    )
    images = [_image(now - timedelta(days=5)), _image(now)]
    status = resolve_audit_ready_status(
        assessment,
        base_verification_status="satellite_corroborated",
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=10),
        fusion_score=80.0,
    )
    assert status == "satellite_corroborated"
    assert not meets_audit_ready_criteria(
        duplicate_photo=False,
        duplicate_coordinate=False,
        images=images,
        satellite_verified=True,
        satellite_scene_at=now - timedelta(days=10),
        fusion_score=80.0,
        base_verification_status="satellite_corroborated",
    )


@pytest.mark.asyncio
async def test_project_monitoring_gate_blocks_stale_optical():
    project_id = uuid.uuid4()
    fence = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=project_id,
        last_satellite_at=datetime.now(UTC) - timedelta(days=VERIFIED_MAX_OPTICAL_STALE_DAYS + 5),
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[fence]))))
    )
    with patch(
        "app.services.integrity.monitoring_gate.build_sar_ops_summary",
        new_callable=AsyncMock,
        return_value={"sar_avg_forest_integrity": 70.0, "work_areas": []},
    ):
        result = await project_monitoring_gate(db, project_id)
    assert result["passed"] is False
    assert "optical_scan_stale" in result["reasons"]


@pytest.mark.asyncio
async def test_project_monitoring_gate_blocks_low_sar():
    project_id = uuid.uuid4()
    fence = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=project_id,
        last_satellite_at=datetime.now(UTC) - timedelta(days=10),
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[fence]))))
    )
    with patch(
        "app.services.integrity.monitoring_gate.build_sar_ops_summary",
        new_callable=AsyncMock,
        return_value={"sar_avg_forest_integrity": VERIFIED_MIN_SAR_INTEGRITY - 5, "work_areas": []},
    ):
        result = await project_monitoring_gate(db, project_id)
    assert result["passed"] is False
    assert "sar_integrity_below_minimum" in result["reasons"]


@pytest.mark.asyncio
async def test_assert_credit_transition_verified_blocks_on_monitoring():
    rows = [
        (
            SimpleNamespace(public_code="T-1", verification_status="field_verified"),
            SimpleNamespace(
                fusion_score=80.0,
                credit_eligible=True,
                duplicate_photo=False,
                duplicate_coordinate=False,
                composite_risk=0.1,
            ),
        )
        for _ in range(5)
    ]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    with (
        patch(
            "app.services.integrity.credit_gating.project_monitoring_gate",
            new_callable=AsyncMock,
            return_value={"passed": False, "reasons": ["optical_scan_stale"], "message": "stale"},
        ),
        pytest.raises(IntegrityGateError, match="integrity_gate_failed:verified:optical_scan_stale"),
    ):
        await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="verified")
