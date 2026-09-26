"""P1 anti-fraud hardening tests: strict EXIF, monitoring in gate detail, audit blockers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.integrity.credit_gating import (
    IntegrityGateError,
    _blocking_reasons,
    assert_credit_transition_allowed,
    integrity_gate_detail,
)
from app.services.integrity.exif import ExifExtract, ExifGps
from app.services.integrity.photo_evidence import (
    MAX_STRICT_PRIMARY_PHOTO_AGE_DAYS,
    strict_primary_photo_blockers,
    strict_primary_photo_valid,
)


def test_strict_primary_photo_requires_exif_gps_and_recent_timestamp():
    now = datetime.now(UTC)
    valid = ExifExtract(
        taken_at=now - timedelta(days=1),
        gps=ExifGps(latitude=12.9, longitude=77.6),
        width_px=100,
        height_px=100,
        raw={},
    )
    assert strict_primary_photo_valid(valid) is True
    assert strict_primary_photo_blockers(None) == ["missing_exif"]
    assert "missing_photo_gps" in strict_primary_photo_blockers(
        ExifExtract(taken_at=now, gps=None, width_px=1, height_px=1, raw={})
    )
    stale = ExifExtract(
        taken_at=now - timedelta(days=MAX_STRICT_PRIMARY_PHOTO_AGE_DAYS + 1),
        gps=ExifGps(latitude=12.9, longitude=77.6),
        width_px=100,
        height_px=100,
        raw={},
    )
    assert "photo_timestamp_stale" in strict_primary_photo_blockers(stale)


def test_blocking_reasons_include_audit_ready_blockers():
    tree = SimpleNamespace(verification_status="satellite_corroborated")
    risk = SimpleNamespace(
        fusion_score=80.0,
        credit_eligible=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        composite_risk=0.1,
        fusion_details={"audit_ready_blockers": ["photo_span_too_short"]},
    )
    reasons = _blocking_reasons(tree, risk)
    assert "photo_span_too_short" in reasons


@pytest.mark.asyncio
async def test_integrity_gate_detail_includes_monitoring_gate():
    tree = SimpleNamespace(
        id=uuid.uuid4(),
        public_code="T-1",
        verification_status="field_verified",
    )
    risk = SimpleNamespace(
        fusion_score=80.0,
        credit_eligible=True,
        duplicate_photo=False,
        duplicate_coordinate=False,
        composite_risk=0.1,
        fusion_details={},
    )
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[(tree, risk)])))
    monitoring = {
        "passed": False,
        "reasons": ["optical_scan_stale"],
        "message": "stale",
        "sar_avg_forest_integrity": 70.0,
        "max_optical_stale_days": 90,
    }
    with patch(
        "app.services.integrity.credit_gating.project_monitoring_gate",
        new_callable=AsyncMock,
        return_value=monitoring,
    ):
        detail = await integrity_gate_detail(db, uuid.uuid4())
    assert detail["monitoring_gate"] == monitoring
    assert detail["monitoring_ready"] is False
    assert detail["verified_ready"] is False
    assert detail["issued_ready"] is False


@pytest.mark.asyncio
async def test_assert_credit_transition_issued_blocks_on_monitoring():
    rows = [
        (
            SimpleNamespace(public_code="T-1", verification_status="audit_ready"),
            SimpleNamespace(
                fusion_score=80.0,
                credit_eligible=True,
                duplicate_photo=False,
                duplicate_coordinate=False,
                composite_risk=0.1,
                fusion_details={},
            ),
        )
        for _ in range(10)
    ]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    with (
        patch(
            "app.services.integrity.credit_gating.project_monitoring_gate",
            new_callable=AsyncMock,
            return_value={"passed": False, "reasons": ["sar_integrity_below_minimum"], "message": "low"},
        ),
        pytest.raises(IntegrityGateError, match="integrity_gate_failed:issued:sar_integrity_below_minimum"),
    ):
        await assert_credit_transition_allowed(db, uuid.uuid4(), to_status="issued")
