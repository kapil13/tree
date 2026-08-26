"""Gaussian plume dispersion tests."""

from __future__ import annotations

from app.services.emissions.dispersion.gaussian import run_gaussian_plume


def test_gaussian_plume_returns_contours_and_downwind():
    source = {"type": "Point", "coordinates": [77.59, 12.97]}
    work_area = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.58, 12.96],
                [77.60, 12.96],
                [77.60, 12.98],
                [77.58, 12.98],
                [77.58, 12.96],
            ]
        ],
    }
    result = run_gaussian_plume(
        source_point=source,
        work_area_polygon=work_area,
        emission_rate_g_s=50.0,
        release_height_m=2.0,
        wind_speed_ms=4.0,
        wind_direction_deg=270.0,
        stability_class="D",
        downwind_km=5.0,
        crosswind_km=1.0,
        gas_type="CH4",
    )
    assert result["gas_type"] == "CH4"
    assert result["max_concentration_ug_m3"] > 0
    assert result["downwind_impact"]["type"] == "FeatureCollection"
    assert len(result["downwind_impact"]["features"]) >= 1
