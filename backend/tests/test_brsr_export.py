"""Tests for SEBI BRSR Core export."""

from __future__ import annotations

import json
import uuid
import zipfile
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.reports.brsr import (
    build_brsr_context,
    render_brsr_json,
    render_brsr_xlsx,
    render_brsr_zip,
)


def _org():
    org = MagicMock()
    org.id = uuid.uuid4()
    org.name = "Demo Corp"
    org.slug = "demo-corp"
    return org


@pytest.mark.asyncio
async def test_build_brsr_context_includes_p6_indicators():
    org = _org()
    project = MagicMock()
    project.id = uuid.uuid4()
    project.code = "NHAI-DEMO"
    project.name = "Demo Highway"
    project.scheme_code = "nhai_highway"

    db = AsyncMock()

    with (
        patch(
            "app.services.reports.brsr._portfolio_projects",
            new=AsyncMock(return_value=[project]),
        ),
        patch(
            "app.services.reports.brsr._project_ghg_lines",
            new=AsyncMock(
                return_value=[
                    {
                        "line_id": "L1",
                        "project_code": "NHAI-DEMO",
                        "brsr_indicator": "P6.E4",
                        "scope": "Land Sector",
                        "scope_tag": "Scope 1 equivalent — removals",
                        "ghg_protocol_category": "Removals",
                        "gas": "CO2",
                        "amount_tco2e": 1.0,
                        "uncertainty_pct": 10.0,
                        "co2e_lower_90_t": 0.9,
                        "co2e_upper_90_t": 1.1,
                        "methodology": "VERRA_VM0047",
                    }
                ]
            ),
        ),
        patch(
            "app.services.reports.brsr.build_project_mrv_context",
            new=AsyncMock(
                return_value={
                    "summary": {"tree_count": 0, "open_violations": 0},
                    "project": {"code": "NHAI-DEMO"},
                }
            ),
        ),
        patch(
            "app.services.reports.brsr.org_credit_summary",
            new=AsyncMock(return_value={"project_count": 1, "total_net_credits_tco2e": 0}),
        ),
        patch(
            "app.services.reports.brsr._assurance_pack",
            new=AsyncMock(return_value={"verifier_attestations_count": 0, "credit_serials": []}),
        ),
    ):
        ctx = await build_brsr_context(db, organization=org)

    assert ctx["brsr_core_version"] == "2024"
    assert ctx["principle"] == 6
    ids = {i["indicator_id"] for i in ctx["essential_indicators"]}
    assert "P6.E4" in ids
    assert "P6.E7" in ids
    assert "P6.E-ASSURANCE" in ids
    p6e4 = next(i for i in ctx["essential_indicators"] if i["indicator_id"] == "P6.E4")
    assert p6e4["ghg_inventory"][0]["scope_tag"] == "Scope 1 equivalent — removals"


def test_brsr_json_and_xlsx_render():
    ctx = {
        "brsr_core_version": "2024",
        "principle": 6,
        "organization": {"name": "Demo", "slug": "demo"},
        "reporting_year": 2026,
        "generated_at": "2026-01-01T00:00:00+00:00",
        "scope": "organization_portfolio",
        "essential_indicators": [
            {
                "indicator_id": "P6.E4",
                "ghg_inventory": [
                    {
                        "line_id": "L1",
                        "project_code": "P1",
                        "brsr_indicator": "P6.E4",
                        "scope": "Land Sector",
                        "scope_tag": "Scope 1 equivalent — removals",
                        "ghg_protocol_category": "Removals",
                        "gas": "CO2",
                        "amount_tco2e": 1.0,
                        "uncertainty_pct": 10.0,
                        "co2e_lower_90_t": 0.9,
                        "co2e_upper_90_t": 1.1,
                        "methodology": "VERRA_VM0047",
                    }
                ],
            },
            {"indicator_id": "P6.E7", "name": "Bio", "description": "d"},
            {
                "indicator_id": "P6.E-ASSURANCE",
                "assurance_pack": {"auditor_access": "viewer"},
            },
        ],
    }
    parsed = json.loads(render_brsr_json(ctx))
    assert parsed["principle"] == 6
    xlsx = render_brsr_xlsx(ctx)
    assert xlsx[:2] == b"PK"
    zbytes = render_brsr_zip(ctx)
    with zipfile.ZipFile(BytesIO(zbytes)) as zf:
        names = zf.namelist()
        assert any(n.endswith(".json") for n in names)
        assert any(n.endswith(".xlsx") for n in names)
