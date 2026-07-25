"""Tests for Wave 7.3 executive intelligence brief."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest

from app.services.intelligence.brief import build_executive_brief_rules


class _Alert:
    def __init__(self, *, severity: str, title: str, is_read: bool = False):
        self.id = uuid.uuid4()
        self.severity = severity
        self.title = title
        self.is_read = is_read
        self.payload = {}


def test_brief_rules_high_risk_site():
    summary = {
        "highest_risk": "high",
        "weather_alert_count": 2,
        "pest_high_count": 1,
        "tree_count": 120,
        "threat_sites": [{"composite_risk": "high", "work_area_name": "Block A"}],
        "pest_hotspots": [],
        "biodiversity": {"unique_species_in_latest_snapshots": 5},
    }
    result = build_executive_brief_rules(summary=summary, alerts=[])
    assert "inspection" in result["headline"].lower()
    assert len(result["lines"]) >= 2
    assert result["metrics"]["highest_risk"] == "high"


def test_brief_rules_priority_alert_from_unread():
    summary = {"highest_risk": "low", "weather_alert_count": 0, "pest_high_count": 0, "tree_count": 10}
    alerts = [_Alert(severity="critical", title="NDVI drop", is_read=False)]
    result = build_executive_brief_rules(summary=summary, alerts=alerts)
    assert result["priority_alert"] is not None
    assert result["priority_alert"]["title"] == "NDVI drop"


@pytest.mark.asyncio
async def test_build_executive_brief_cache_hit(monkeypatch):
    from app.services.intelligence import brief as mod

    user_id = uuid.uuid4()

    class _User:
        id = user_id

    cached = {
        "generated_at": datetime.now(UTC).isoformat(),
        "headline": "Cached",
        "lines": ["Line 1"],
        "metrics": {},
        "llm_enriched": False,
        "highest_risk": "low",
    }

    async def _fake_get(key):
        if key.endswith(str(user_id)):
            return cached
        return None

    monkeypatch.setattr(mod, "cache_get", _fake_get)
    result = await mod.build_executive_brief(object(), _User(), llm=False, refresh=False)  # type: ignore[arg-type]
    assert result["cache_hit"] is True
    assert result["headline"] == "Cached"
