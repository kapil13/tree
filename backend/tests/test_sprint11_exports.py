"""Tests for Sprint 11–12 TNFD, GHG Protocol, Darwin Core exports."""

from __future__ import annotations

import json
import uuid
import zipfile
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.biodiversity.darwin_core import (
    build_darwin_occurrences,
    render_darwin_json,
    render_darwin_zip,
)
from app.services.carbon.ghg_protocol import (
    build_ghg_protocol_context,
    render_ghg_protocol_xlsx,
)
from app.services.reports.tnfd import build_tnfd_context, render_tnfd_json, render_tnfd_zip


def _org():
    org = MagicMock()
    org.id = uuid.uuid4()
    org.name = "Demo Org"
    org.slug = "demo-org"
    return org


def _project():
    p = MagicMock()
    p.id = uuid.uuid4()
    p.code = "DEMO-01"
    p.name = "Demo Project"
    p.segment = "general"
    p.scheme_code = "ngo_community"
    return p


@pytest.mark.asyncio
async def test_build_tnfd_context_leap_phases():
    org = _org()
    project = _project()
    db = AsyncMock()

    with (
        patch(
            "app.services.reports.tnfd.select",
        ),
        patch(
            "app.services.reports.tnfd.build_project_mrv_context",
            new=AsyncMock(
                return_value={
                    "summary": {"tree_count": 5, "open_violations": 0, "native_species_pct": 80},
                    "scheme": {"code": "ngo_community"},
                }
            ),
        ),
    ):
        # Mock project query
        projects_result = MagicMock()
        projects_result.scalars.return_value.all.return_value = [project]
        fences_result = MagicMock()
        fences_result.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(side_effect=[projects_result, fences_result])

        ctx = await build_tnfd_context(db, organization=org)

    assert ctx["standard"] == "TNFD"
    assert "locate" in ctx["leap"]
    assert "evaluate" in ctx["leap"]
    assert "assess" in ctx["leap"]
    assert "prepare" in ctx["leap"]


@pytest.mark.asyncio
async def test_build_ghg_protocol_context_inventory():
    org = _org()
    project = _project()
    db = AsyncMock()

    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = [
        MagicMock(current_carbon_kg=100.0)
    ]
    ledger_result = MagicMock()
    ledger_result.scalar_one_or_none.return_value = None
    projects_result = MagicMock()
    projects_result.scalars.return_value.all.return_value = [project]

    db.execute = AsyncMock(side_effect=[projects_result, trees_result, ledger_result])

    with patch(
        "app.services.carbon.ghg_protocol.build_project_mrv_context",
        new=AsyncMock(return_value={"summary": {"tree_count": 1, "work_area_count": 1}}),
    ):
        ctx = await build_ghg_protocol_context(db, organization=org)

    assert ctx["standard"] == "GHG Protocol Land Sector"
    assert len(ctx["inventory_lines"]) >= 2
    assert ctx["inventory_lines"][0]["ghg_protocol_category"]


@pytest.mark.asyncio
async def test_build_darwin_occurrences_from_trees():
    project = _project()
    db = AsyncMock()
    fences_result = MagicMock()
    fences_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=fences_result)

    trees_result = MagicMock()
    trees_result.scalars.return_value.all.return_value = [
        MagicMock(
            id=uuid.uuid4(),
            species_text="Azadirachta indica",
            latitude=12.97,
            longitude=77.59,
            planted_at=None,
            public_code="T001",
            current_health="healthy",
            satellite_verified=True,
            status="active",
        )
    ]
    # Second execute for trees
    db.execute = AsyncMock(side_effect=[fences_result, trees_result])

    occurrences = await build_darwin_occurrences(db, project=project, organization_name="Demo")
    assert len(occurrences) == 1
    assert occurrences[0]["scientificName"] == "Azadirachta indica"
    assert occurrences[0]["kingdom"] == "Plantae"


def test_render_exports_smoke():
    tnfd_ctx = {
        "standard": "TNFD",
        "organization": {"slug": "demo"},
        "leap": {"locate": {"sites": []}, "evaluate": {"site_metrics": []}, "assess": {"site_assessments": []}, "prepare": {"project_disclosures": []}},
    }
    assert json.loads(render_tnfd_json(tnfd_ctx))["standard"] == "TNFD"
    z = render_tnfd_zip(tnfd_ctx)
    with zipfile.ZipFile(BytesIO(z)) as zf:
        assert any(n.endswith(".json") for n in zf.namelist())

    ghg_ctx = {"inventory_lines": [{"line_id": "L1", "project_code": "P", "scope": "Scope 1", "ghg_protocol_category": "Removals", "land_sector_subcategory": "A/R", "gas": "CO2", "amount_tco2e": 1, "uncertainty_pct": 10, "co2e_lower_90_t": 0.9, "co2e_upper_90_t": 1.1}]}
    assert render_ghg_protocol_xlsx(ghg_ctx)[:2] == b"PK"

    occ = [{"occurrenceID": "1", "basisOfRecord": "HumanObservation", "scientificName": "Sp", "kingdom": "Plantae"}]
    assert b"occurrences" in render_darwin_json(occ, {"project_code": "P", "record_count": 1})
    dz = render_darwin_zip(occ, project_code="P", org_name="Demo")
    with zipfile.ZipFile(BytesIO(dz)) as zf:
        assert "occurrence.txt" in zf.namelist()
