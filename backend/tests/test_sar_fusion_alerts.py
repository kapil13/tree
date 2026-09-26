"""Tests for SAR fusion operational alerts (Phase 3)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.monitoring.sar_fusion_alerts import (
    INTEGRITY_DROP_THRESHOLD,
    maybe_alert_sar_fusion,
)


@pytest.mark.asyncio
async def test_integrity_drop_alert():
    user = object()
    created: list[str] = []

    async def _fake_create(db, **kwargs):
        created.append(kwargs["kind"])
        return object()

    fusion = {
        "forest_integrity_score": 40.0,
        "integrity_grade": "at_risk",
        "monitoring_mode": "sar_stress",
        "summary": "Stress detected",
        "sar_analysis": {"risk_level": "moderate"},
    }
    previous = {"forest_integrity_score": 40.0 + INTEGRITY_DROP_THRESHOLD + 5}

    with patch(
        "app.services.monitoring.sar_fusion_alerts.create_monitoring_alert",
        new=AsyncMock(side_effect=_fake_create),
    ):
        count = await maybe_alert_sar_fusion(
            AsyncMock(),
            user=user,  # type: ignore[arg-type]
            fusion=fusion,
            previous_fusion=previous,
            payload_base={"fence_id": "f1"},
            title_prefix="Pilot site",
        )

    assert "sar_integrity_drop" in created
    assert count >= 1


@pytest.mark.asyncio
async def test_optical_divergent_alert():
    created: list[str] = []

    async def _fake_create(db, **kwargs):
        created.append(kwargs["kind"])
        return object()

    fusion = {
        "forest_integrity_score": 55.0,
        "integrity_grade": "fair",
        "monitoring_mode": "optical_sar_divergent",
        "summary": "Canopy green but SAR wet",
        "sar_analysis": {"risk_level": "high"},
    }

    with patch(
        "app.services.monitoring.sar_fusion_alerts.create_monitoring_alert",
        new=AsyncMock(side_effect=_fake_create),
    ):
        await maybe_alert_sar_fusion(
            AsyncMock(),
            user=object(),  # type: ignore[arg-type]
            fusion=fusion,
            payload_base={"fence_id": "f1"},
            title_prefix="Site A",
        )

    assert "sar_optical_divergent" in created


@pytest.mark.asyncio
async def test_no_alerts_when_user_missing():
    with patch(
        "app.services.monitoring.sar_fusion_alerts.create_monitoring_alert",
        new=AsyncMock(),
    ) as mock_create:
        count = await maybe_alert_sar_fusion(
            AsyncMock(),
            user=None,
            fusion={"forest_integrity_score": 30, "monitoring_mode": "sar_stress"},
            payload_base={"fence_id": "f1"},
            title_prefix="X",
        )
    assert count == 0
    mock_create.assert_not_called()
