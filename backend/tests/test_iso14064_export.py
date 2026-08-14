"""Tests for ISO 14064-2 project report export."""

from __future__ import annotations

import json
import uuid
import zipfile
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.reports.iso14064 import (
    build_iso14064_context,
    render_iso14064_json,
    render_iso14064_xlsx,
    render_iso14064_zip,
)


def _project():
    p = MagicMock()
    p.id = uuid.uuid4()
    p.code = "NHAI-DEMO"
    p.name = "Demo Highway"
    p.segment = "nhai_highway"
    p.status = "active"
    p.scheme_code = "nhai_highway"
    return p


def _tree():
    t = MagicMock()
    t.current_carbon_kg = 100.0
    t.last_geotag_at = None
    t.satellite_verified = False
    return t


@pytest.mark.asyncio
async def test_build_iso14064_context_has_required_sections():
    project = _project()
    db = AsyncMock()

    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = [_tree()]
    ledger_result = MagicMock()
    ledger_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(side_effect=[trees_result, ledger_result])

    with patch(
        "app.services.reports.iso14064.build_project_mrv_context",
        new=AsyncMock(
            return_value={
                "project": {"code": "NHAI-DEMO", "name": "Demo Highway"},
                "summary": {"tree_count": 10, "open_violations": 0},
                "work_areas": [{"name": "WA1", "area_ha": 2.5}],
                "scheme": {"code": "nhai_highway"},
            }
        ),
    ):
        ctx = await build_iso14064_context(db, project=project)

    assert ctx["standard"] == "ISO 14064-2"
    assert ctx["project_boundary"]["work_area_count"] == 1
    assert "baseline_scenario" in ctx
    assert "quantification_approach" in ctx
    assert "uncertainty_assessment" in ctx
    assert "monitoring_plan" in ctx
    assert ctx["quantification_approach"]["emission_reductions_removals_tco2e"]["gas"] == "CO2"


def test_iso14064_render_outputs():
    ctx = {
        "standard": "ISO 14064-2",
        "iso14064_version": "2019",
        "generated_at": "2026-01-01T00:00:00+00:00",
        "project": {"code": "P1", "name": "Demo"},
        "project_boundary": {
            "work_area_count": 1,
            "total_area_ha": 1.0,
            "tree_count_in_boundary": 5,
        },
        "baseline_scenario": {"description": "BAU"},
        "quantification_approach": {
            "methodology": "VERRA_VM0047",
            "emission_reductions_removals_tco2e": {
                "gross_removals": 1.0,
                "net_removals": 0.8,
            },
        },
        "uncertainty_assessment": {
            "removals_tco2e_lower": 0.9,
            "removals_tco2e_upper": 1.1,
            "combined_uncertainty_pct": 10.0,
        },
        "monitoring_plan": {"frequency": "Quarterly"},
    }
    parsed = json.loads(render_iso14064_json(ctx))
    assert parsed["standard"] == "ISO 14064-2"
    xlsx = render_iso14064_xlsx(ctx)
    assert xlsx[:2] == b"PK"
    zbytes = render_iso14064_zip(ctx)
    with zipfile.ZipFile(BytesIO(zbytes)) as zf:
        names = zf.namelist()
        assert any(n.endswith(".json") for n in names)
        assert any(n.endswith(".xlsx") for n in names)
