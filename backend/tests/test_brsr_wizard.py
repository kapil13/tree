"""Tests for BRSR Principle 6 wizard readiness and profile."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.reports.brsr_profile import (
    BrsrOrgProfile,
    BrsrOrgProfileUpdate,
    get_brsr_profile,
    profile_disclosure_complete,
    save_brsr_profile,
)
from app.services.reports.brsr_readiness import build_readiness_from_context


def _org():
    org = MagicMock()
    org.id = uuid.uuid4()
    org.name = "Listed Corp"
    org.slug = "listed-corp"
    org.metadata_ = {}
    return org


def test_save_and_load_brsr_profile():
    org = _org()
    profile = save_brsr_profile(
        org,
        BrsrOrgProfileUpdate(
            reporting_year=2025,
            listed_entity=True,
            cin="L12345MH2020PLC123456",
            stock_exchange="NSE",
            assurance_level="limited",
            boundary_notes="India operations only",
            manual_kpis={
                "P6.E1": {"value_summary": "12,400 MWh grid + solar", "source": "ERP"},
            },
            wizard_completed_steps=["disclosure", "scope"],
        ),
    )
    assert profile.reporting_year == 2025
    assert profile.cin == "L12345MH2020PLC123456"
    loaded = get_brsr_profile(org)
    assert loaded.manual_kpis["P6.E1"].value_summary.startswith("12,400")
    assert profile_disclosure_complete(loaded) is True


def test_readiness_scores_kpis_and_blockers():
    ctx = {
        "core_kpi_mapping": [
            {"kpi_id": "P6.E4", "name": "GHG", "data_available": True, "value_summary": "1.2 t"},
            {"kpi_id": "P6.E7", "name": "Bio", "data_available": True, "value_summary": "100 trees"},
            {"kpi_id": "P6.E8", "name": "VC", "data_available": False, "value_summary": None},
        ],
        "value_chain_annex": [
            {"project_code": "P1", "project_name": "Site A", "supplier_ref": None},
        ],
    }
    profile = BrsrOrgProfile(
        reporting_year=2025,
        listed_entity=True,
        cin="L12345MH2020PLC123456",
    )
    readiness = build_readiness_from_context(ctx, profile)
    assert readiness["kpi_available_count"] == 2
    assert readiness["disclosure_complete"] is True
    assert readiness["readiness_pct"] >= 50
    assert any("supplier_ref" in b for b in readiness["blockers"])


@pytest.mark.asyncio
async def test_build_brsr_readiness_integration():
    org = _org()
    org.metadata_["brsr"] = {
        "reporting_year": 2025,
        "listed_entity": True,
        "cin": "L12345MH2020PLC123456",
        "assurance_level": "limited",
        "manual_kpis": {},
        "wizard_completed_steps": [],
    }
    db = AsyncMock()
    with patch(
        "app.services.reports.brsr_readiness.build_brsr_context",
        new=AsyncMock(
            return_value={
                "scope": "organization_portfolio",
                "project_id": None,
                "reporting_year": 2025,
                "organization": {"name": "Listed Corp"},
                "core_kpi_mapping": [
                    {
                        "kpi_id": "P6.E4",
                        "name": "GHG",
                        "data_available": True,
                        "value_summary": "1.0 t",
                        "platform_source": "ghg_inventory",
                        "notes": "",
                    }
                ],
                "value_chain_annex": [],
                "essential_indicators": [{"indicator_id": "P6.E4"}],
            }
        ),
    ):
        from app.services.reports.brsr_readiness import build_brsr_readiness

        state = await build_brsr_readiness(db, organization=org)
    assert state["readiness"]["kpi_available_count"] == 1
    assert state["profile"]["disclosure_complete"] is True
