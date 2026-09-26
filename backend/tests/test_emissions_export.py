"""Tests for GHG / methane compliance PDF export (Phase 5)."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.services.emissions.export import build_emissions_compliance_context
from app.services.reports.emissions_compliance_report import render_emissions_compliance_pdf


def _scalar_result(value):
    return MagicMock(scalar_one_or_none=MagicMock(return_value=value))


def test_build_emissions_compliance_context_minimal(monkeypatch):
    project = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        code="GHG-01",
        name="Pilot Site",
        segment="industrial_greenbelt",
        compliance_mode="standard",
    )
    work_area = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000002",
        name="Block A",
        geometry_type="polygon",
        area_ha=12.5,
        segment_code="A1",
    )

    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _scalar_result(None),
            _scalar_result(None),
            _scalar_result(None),
        ]
    )

    monkeypatch.setattr(
        "app.services.emissions.export.list_emission_sources",
        AsyncMock(return_value=[]),
    )

    ctx = asyncio.run(build_emissions_compliance_context(db, project=project, work_area=work_area))

    assert ctx["project"]["code"] == "GHG-01"
    assert ctx["work_area"]["name"] == "Block A"
    assert ctx["summary"]["source_count"] == 0
    assert ctx["summary"]["has_dispersion"] is False
    assert ctx["summary"]["has_satellite_scan"] is False
    assert ctx["summary"]["has_fusion"] is False
    assert ctx["dispersion"] is None
    assert ctx["satellite_scan"] is None
    assert ctx["fusion"] is None


def test_render_emissions_compliance_pdf():
    ctx = {
        "project": {"code": "GHG-01", "name": "Pilot Site"},
        "work_area": {"name": "Block A", "geometry_type": "polygon", "area_ha": 10.0},
        "summary": {
            "source_count": 1,
            "active_source_count": 1,
            "total_active_rate_g_s": 10.0,
            "has_dispersion": True,
            "has_satellite_scan": True,
            "has_fusion": True,
            "fusion_verdict": "consistent",
            "fusion_alignment_score": 82.5,
        },
        "sources": [
            {
                "name": "Landfill vent",
                "source_type": "landfill",
                "gas_type": "CH4",
                "status": "active",
                "emission_rate_g_s": 10.0,
                "annual_emission_tons": None,
                "release_height_m": 2.0,
            }
        ],
        "dispersion": {
            "gas_type": "CH4",
            "wind_speed_ms": 3.5,
            "wind_direction_deg": 270.0,
            "stability_class": "D",
            "max_concentration_ug_m3": 120.5,
            "downwind_km": 10.0,
            "extends_outside_work_area": True,
            "met_provider": "open-meteo",
            "created_at": "2024-06-01T00:00:00+00:00",
        },
        "satellite_scan": {
            "provider": "sentinel-5p-tropomi",
            "buffer_km": 25.0,
            "latest_mean_ppb": 1870.0,
            "baseline_ppb": 1858.0,
            "anomaly_ppb": 12.0,
            "months": 6,
            "latest_time": "2024-06-01",
            "created_at": "2024-06-01T00:00:00+00:00",
        },
        "fusion": {
            "verdict": "consistent",
            "alignment_score": 82.5,
            "summary": "Satellite anomaly aligns with declared source and downwind plume.",
            "anomaly_ppb": 12.0,
            "wind_speed_ms": 3.5,
            "wind_direction_deg": 270.0,
            "plume_extends_outside": True,
            "pipeline": "byot-emission-fusion-1.0.0",
            "created_at": "2024-06-01T00:00:00+00:00",
            "findings": [
                {
                    "category": "anomaly",
                    "severity": "info",
                    "message": "Elevated CH₄ anomaly detected.",
                }
            ],
        },
        "data_sources": ["Open-Meteo", "TROPOMI"],
        "disclaimer": "Not a legal certificate.",
    }

    pdf = render_emissions_compliance_pdf(ctx)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1500
