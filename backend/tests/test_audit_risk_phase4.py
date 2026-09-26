"""Tests for Estate Watch Phase 4 risk & anomaly engine."""

from __future__ import annotations

import pytest

from app.services.audit_risk.detect import compute_block_risk, detect_block_anomalies


def test_detect_ndvi_acute_drop():
    anomalies = detect_block_anomalies(
        block_name="Block A",
        temporal_observations=[
            {"phase": "t0", "ndvi_mean": 0.45},
            {"phase": "current", "ndvi_mean": 0.28},
        ],
        confidence_grade="green",
        confidence_score=80,
        plausibility_verdict="plausible",
        gis_block_issues=[],
        trees_claimed=5000,
    )
    types = {a["anomaly_type"] for a in anomalies}
    assert "ndvi_acute_drop" in types
    drop = next(a for a in anomalies if a["anomaly_type"] == "ndvi_acute_drop")
    assert drop["severity"] in {"high", "critical"}


def test_detect_confidence_and_plausibility():
    anomalies = detect_block_anomalies(
        block_name="Block B",
        temporal_observations=[],
        confidence_grade="red",
        confidence_score=25,
        plausibility_verdict="inconsistent",
        gis_block_issues=[{"code": "overlap", "message": "Overlaps adjacent block"}],
        trees_claimed=None,
    )
    types = {a["anomaly_type"] for a in anomalies}
    assert "confidence_low" in types
    assert "plausibility_concern" in types
    assert "gis_geometry_issue" in types


def test_compute_block_risk_critical():
    anomalies = [
        {"anomaly_type": "ndvi_acute_drop", "severity": "critical"},
        {"anomaly_type": "confidence_low", "severity": "high"},
    ]
    risk = compute_block_risk(anomalies=anomalies, confidence_score=20)
    assert risk["risk_level"] in {"critical", "high"}
    assert risk["anomaly_count"] == 2
    assert risk["recommended_action"]


def test_compute_block_risk_low():
    risk = compute_block_risk(anomalies=[], confidence_score=85)
    assert risk["risk_level"] == "low"
    assert risk["anomaly_count"] == 0


@pytest.mark.asyncio
async def test_run_risk_scan_requires_confidence_mapped():
    from types import SimpleNamespace

    from app.services.audit_risk.scan import run_risk_scan

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="analysis_ready",
        metadata_={},
    )
    project = SimpleNamespace(owner_user_id=None)
    db = SimpleNamespace()

    with pytest.raises(ValueError, match="confidence_not_mapped"):
        await run_risk_scan(db, engagement, project)
