"""Tests for alert interpreter fire/flood hazard kinds."""

from __future__ import annotations

from app.services.alerts.interpreter import interpret_alert


def test_interpret_fire_alert():
    brief = interpret_alert(
        kind="fire_alert",
        severity="warning",
        title="Fire watch — Block A",
        message="Nearest fire ~8 km away.",
        payload={"work_area_name": "Block A", "distance_km": 8},
    )
    assert brief["category"] == "fire"
    assert "Block A" in brief["headline"]


def test_interpret_flood_extent_alert():
    brief = interpret_alert(
        kind="flood_extent_alert",
        severity="warning",
        title="Flood extent watch — Block B",
        message="SAR water extent rising.",
        payload={"work_area_name": "Block B", "water_extent_score": 0.72},
    )
    assert brief["category"] == "flood"
    assert "drainage" in brief["prepare"][0].lower()
