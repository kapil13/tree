"""Tests for SAR alert deep links and field verification tasks."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.monitoring.sar_alert_links import enrich_sar_alert_payload
from app.services.monitoring.sar_field_tasks import (
    FIELD_VERIFICATION_TYPE,
    maybe_create_sar_field_verification,
)


def test_enrich_sar_alert_payload_fence():
    out = enrich_sar_alert_payload({"fence_id": "abc", "project_id": "p1"})
    assert out["deep_link"] == "/satellite?fence=abc"
    assert out["mobile_deep_link"] == "/monitoring?fence=abc"
    assert out["action_label"]


def test_enrich_sar_alert_payload_tree():
    out = enrich_sar_alert_payload({"tree_id": "t1"})
    assert out["deep_link"] == "/trees/t1"
    assert out["mobile_deep_link"] == "/trees/t1"


@pytest.mark.asyncio
async def test_field_verification_skips_moderate():
    db = AsyncMock()
    result = await maybe_create_sar_field_verification(
        db,
        project_id="p1",
        work_area_id="f1",
        tree_id=None,
        alert_kind="sar_integrity_at_risk",
        severity="moderate",
        message="test",
    )
    assert result is None
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_field_verification_creates_high_severity():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: []))))
    violation = await maybe_create_sar_field_verification(
        db,
        project_id="00000000-0000-0000-0000-000000000001",
        work_area_id="00000000-0000-0000-0000-000000000002",
        tree_id=None,
        alert_kind="sar_optical_divergent",
        severity="high",
        message="Verify drainage on site",
        fusion={"forest_integrity_score": 42, "monitoring_mode": "optical_sar_divergent"},
    )
    assert violation is not None
    assert violation.violation_type == FIELD_VERIFICATION_TYPE
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_fusion_alert_creates_field_task():
    from app.services.monitoring.sar_fusion_alerts import maybe_alert_sar_fusion

    with patch(
        "app.services.monitoring.sar_fusion_alerts.create_monitoring_alert",
        new=AsyncMock(return_value=MagicMock(message="alert", severity="high")),
    ), patch(
        "app.services.monitoring.sar_fusion_alerts.maybe_create_sar_field_verification",
        new=AsyncMock(return_value=object()),
    ) as field_mock:
        await maybe_alert_sar_fusion(
            AsyncMock(),
            user=object(),  # type: ignore[arg-type]
            fusion={
                "forest_integrity_score": 55.0,
                "integrity_grade": "fair",
                "monitoring_mode": "optical_sar_divergent",
                "summary": "Mismatch",
                "sar_analysis": {"risk_level": "high"},
            },
            payload_base={"fence_id": "f1", "project_id": "p1"},
            title_prefix="Site",
        )
    field_mock.assert_awaited()
