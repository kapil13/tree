"""Tests for multi-gas emission registry."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.emissions.constants import GAS_TYPES, emission_catalog
from app.services.emissions.dispersion.run import DispersionError, run_dispersion


def test_emission_catalog_lists_all_gases():
    catalog = emission_catalog()
    codes = [g["code"] for g in catalog["gases"]]
    assert codes == list(GAS_TYPES)
    ch4 = next(g for g in catalog["gases"] if g["code"] == "CH4")
    assert ch4["fusion_supported"] is True
    no2 = next(g for g in catalog["gases"] if g["code"] == "NO2")
    assert no2["satellite_supported"] is False


@pytest.mark.asyncio
async def test_dispersion_rejects_mixed_gas_sources():
    project_id = uuid.uuid4()
    work_area_id = uuid.uuid4()
    user = SimpleNamespace(id=uuid.uuid4())
    work_area = SimpleNamespace(project_id=project_id, boundary=SimpleNamespace())
    ch4 = SimpleNamespace(
        id=uuid.uuid4(),
        work_area_id=work_area_id,
        status="active",
        gas_type="CH4",
        release_height_m=2.0,
        location=SimpleNamespace(),
        emission_rate_g_s=5.0,
        annual_emission_tons=None,
    )
    no2 = SimpleNamespace(
        id=uuid.uuid4(),
        work_area_id=work_area_id,
        status="active",
        gas_type="NO2",
        release_height_m=2.0,
        location=SimpleNamespace(),
        emission_rate_g_s=3.0,
        annual_emission_tons=None,
    )
    payload = SimpleNamespace(
        work_area_id=work_area_id,
        duration_hours=24,
        met_hour_index=0,
        downwind_km=10.0,
        crosswind_km=2.0,
    )
    db = AsyncMock()

    with (
        patch(
            "app.services.emissions.dispersion.run._source_point_geometry",
            return_value={"type": "Point", "coordinates": [77.2, 28.6]},
        ),
        pytest.raises(DispersionError, match="mixed_gas_types"),
    ):
        await run_dispersion(
            db,
            project_id=project_id,
            user=user,
            payload=payload,
            work_area=work_area,
            sources=[ch4, no2],
        )
