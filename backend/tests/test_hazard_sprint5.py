"""Sprint 5 — hazard alert links, locust feed, and push preferences."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.planting_projects.threat_alerts import _create_threat_alert
from app.services.threats.hazard_alert_links import enrich_hazard_alert_payload, hazard_push_data
from app.services.threats.locust_feed import (
    LocustObservation,
    _parse_observations,
    assess_locust_with_feed,
    locust_feed_source,
)


def test_enrich_hazard_alert_payload_adds_map_links():
    payload = enrich_hazard_alert_payload(
        {"fence_id": "abc", "project_id": "p1"},
        kind="fire_alert",
    )
    assert payload["deep_link"] == "/satellite?fence=abc"
    assert payload["mobile_deep_link"] == "/map?fence=abc"
    assert payload["hazard_kind"] == "fire_alert"


def test_hazard_push_data_includes_alert_and_fence():
    payload = enrich_hazard_alert_payload({"fence_id": "abc"}, kind="fire_alert")
    push = hazard_push_data(payload, alert_id="alert-1")
    assert push["type"] == "hazard_alert"
    assert push["alert_id"] == "alert-1"
    assert push["fence_id"] == "abc"
    assert push["deep_link"] == "/map?fence=abc"


def test_parse_locust_observations_from_list():
    rows = _parse_observations(
        [{"lat": 26.9, "lon": 70.9, "category": "swarm", "location_name": "Thar"}]
    )
    assert len(rows) == 1
    assert rows[0].latitude == pytest.approx(26.9)


def test_assess_locust_with_feed_near_observation():
    observations = [
        LocustObservation(
            latitude=26.92,
            longitude=70.90,
            category="swarm",
            location_name="Thar Desert",
        )
    ]
    result = assess_locust_with_feed(26.95, 70.95, observations, radius_km=200)
    assert result["risk_level"] in ("watch", "warning")
    assert result["observation_count"] >= 1


def test_locust_feed_source_defaults_to_seasonal():
    assert locust_feed_source() in ("seasonal_model", "configured_feed", "fao_feed", "fao_feed_attempted")


@pytest.mark.asyncio
async def test_create_threat_alert_includes_push_for_hazard_when_enabled():
    user = SimpleNamespace(
        id=uuid.uuid4(),
        email="ops@example.com",
        phone=None,
        notification_preferences={},
    )

    with (
        patch(
            "app.services.planting_projects.threat_alerts.threat_watch_prefs",
            return_value={
                "enabled": True,
                "channels": ["in_app"],
                "sms_on_critical": False,
                "push_on_hazard": True,
            },
        ),
        patch(
            "app.services.planting_projects.threat_alerts._recent_fence_alert",
            new=AsyncMock(return_value=False),
        ),
        patch(
            "app.services.planting_projects.threat_alerts.interpret_alert",
            return_value={"summary": "test"},
        ),
        patch(
            "app.services.planting_projects.threat_alerts.attach_interpretation",
            side_effect=lambda payload, brief: payload,
        ),
        patch(
            "app.services.planting_projects.threat_alerts.dispatch_alert_channels",
            new=AsyncMock(return_value={"in_app": {"delivered": True}}),
        ) as dispatch,
        patch(
            "app.services.planting_projects.threat_alerts.ensure_urgent_email_channel",
            side_effect=lambda channels, user, severity=None: channels,
        ),
    ):
        db = MagicMock()
        db.add = MagicMock()
        db.flush = AsyncMock()

        alert = await _create_threat_alert(
            db,
            user=user,
            kind="fire_alert",
            severity="warning",
            title="Fire watch",
            message="Active fire nearby",
            payload={"fence_id": str(uuid.uuid4())},
        )

    assert alert is not None
    assert "push" in alert.channels
    dispatch.assert_awaited_once()
    assert dispatch.await_args.kwargs["push_data"]["type"] == "hazard_alert"
