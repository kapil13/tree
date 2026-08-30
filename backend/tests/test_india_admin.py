"""Tests for India admin geography service."""

from __future__ import annotations

import pytest

from app.services.india_admin.financial_years import current_financial_year, list_financial_years
from app.services.india_admin.service import IndiaAdminService


def test_financial_years_include_current():
    years = list_financial_years(today=__import__("datetime").date(2026, 8, 30))
    assert current_financial_year(today=__import__("datetime").date(2026, 8, 30)) == "2026-27"
    assert "2026-27" in years
    assert "2025-26" in years


def test_static_states_and_districts():
    svc = IndiaAdminService()
    states = svc.states()
    assert len(states) == 36
    raj = next(s for s in states if s["code"] == "08")
    assert raj["name"] == "Rajasthan"

    districts = svc.districts(state_code="08")
    assert len(districts) >= 30
    assert any(d["name"] == "Jaipur" for d in districts)


def test_cities_filtered_by_state():
    svc = IndiaAdminService()
    cities = svc.cities(state_code="08")
    assert len(cities) >= 5
    assert any(c["name"] == "Jaipur" for c in cities)


@pytest.mark.asyncio
async def test_gram_panchayats_from_lgd_bundle():
    svc = IndiaAdminService()
    result = await svc.gram_panchayats(block_lgd=7473)
    assert result["manual_fallback"] is False
    assert result["source"] == "lgd_bundle"
    assert len(result["items"]) >= 10
    assert any("Nawapura" in gp["name"] or "Bakhasar" in gp["name"] for gp in result["items"])


@pytest.mark.asyncio
async def test_villages_from_lgd_bundle():
    svc = IndiaAdminService()
    gp = await svc.gram_panchayats(block_lgd=7473)
    gp_code = gp["items"][0]["code"]
    result = await svc.villages(gram_panchayat_code=gp_code)
    assert result["manual_fallback"] is False
    assert result["source"] == "lgd_bundle"
    assert len(result["items"]) >= 1


@pytest.mark.asyncio
async def test_blocks_for_rajasthan_district(monkeypatch):
    svc = IndiaAdminService()

    async def fake_query(layer_id, *, params, limit=5000):
        assert layer_id == "lgd_blocks"
        return [
            {
                "blkcode11": "0130",
                "block_name": "FAGLIYA",
                "block_lgd": 7473,
                "dtcode11": "115",
                "stcode11": "08",
            }
        ], None

    monkeypatch.setattr(
        "app.services.india_admin.service.query_layer",
        fake_query,
    )
    result = await svc.blocks(state_code="08", district_code="115")
    assert len(result["items"]) == 1
    assert result["items"][0]["name"] == "FAGLIYA"
    assert result["manual_fallback"] is False
