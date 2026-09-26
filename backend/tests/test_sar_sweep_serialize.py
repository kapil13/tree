"""SAR record serialization for API responses."""

from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.monitoring.sar_sweep import serialize_sar_record


def test_serialize_sar_record_backfills_partial_analysis():
    rec = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        provider="sar-gee-sentinel1",
        scene_id="S1_TEST",
        scene_acquired_at=datetime.now(UTC),
        raw_metadata={
            "wetland_probability": 0.42,
            "double_bounce_index": 0.31,
            "ground_moisture_index": 0.55,
            "canopy_ground_mismatch": False,
            "pipeline": "byot-sar-gee-s1-2.0.0",
            "sar_analysis": {
                "risk_level": "low",
                "ground_status": "stable",
                "summary": "SAR ground conditions appear stable.",
                "findings": [],
                "pipeline": "byot-sar-health-1.0.0",
            },
        },
    )

    data = serialize_sar_record(rec)  # type: ignore[arg-type]

    assert data["analysis"]["wetland_probability"] == 0.42
    assert data["analysis"]["double_bounce_index"] == 0.31
    assert data["analysis"]["ground_moisture_index"] == 0.55
    assert data["analysis"]["canopy_ground_mismatch"] is False
