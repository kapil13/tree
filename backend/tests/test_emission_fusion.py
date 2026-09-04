"""Tests for wind-aligned CH₄ emission fusion (Phase 4)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.main import app
from app.schemas.emissions import EmissionFusionResultOut
from app.services.emissions.fusion import (
    FusionError,
    _angular_delta_deg,
    _bearing_deg,
    _wind_blow_to_deg,
    assess_emission_fusion,
    fusion_result_to_dict,
    run_emission_fusion,
)


def _dispersion_result(*, wind_from: float = 270.0, extends_outside: bool = True) -> dict:
    # Source near 28.6N 77.2E; downwind axis to the east (~90° blow-to when wind from 270°)
    return {
        "gas_type": "CH4",
        "wind_speed_ms": 3.5,
        "wind_direction_deg": wind_from,
        "extends_outside_work_area": extends_outside,
        "downwind_km": 10.0,
        "contours": [{"threshold_ug_m3": 100.0, "geojson": {}}],
        "downwind_impact": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"kind": "downwind_axis"},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[77.2, 28.6], [77.35, 28.6]],
                    },
                }
            ],
        },
    }


def _scan_summary(*, anomaly: float = 12.0) -> dict:
    return {
        "latest_time": datetime(2024, 6, 1, tzinfo=UTC).isoformat(),
        "latest_mean_ppb": 1870.0,
        "baseline_ppb": 1858.0,
        "anomaly_ppb": anomaly,
        "months": 6,
    }


def _source(
    *,
    source_id: uuid.UUID | None = None,
    lat: float = 28.6,
    lon: float = 77.2,
    name: str = "Landfill A",
) -> SimpleNamespace:
    return SimpleNamespace(
        id=source_id or uuid.uuid4(),
        name=name,
        gas_type="CH4",
        status="active",
        emission_rate_g_s=10.0,
        annual_emission_tons=None,
        location=SimpleNamespace(),
        _lat=lat,
        _lon=lon,
    )


def test_bearing_and_wind_helpers():
    assert _wind_blow_to_deg(270.0) == pytest.approx(90.0, abs=0.1)
    bearing = _bearing_deg(28.6, 77.2, 28.6, 77.35)
    assert bearing == pytest.approx(90.0, abs=2.0)
    assert _angular_delta_deg(90.0, 95.0) == pytest.approx(5.0)


def test_fusion_consistent_when_anomaly_and_plume_aligned():
    src = _source()
    with patch(
        "app.services.emissions.fusion.geography_to_geojson_geometry",
        return_value={"type": "Point", "coordinates": [77.2, 28.6]},
    ):
        result = assess_emission_fusion(
            sources=[src],  # type: ignore[list-item]
            dispersion_result=_dispersion_result(wind_from=270.0),
            scan_summary=_scan_summary(anomaly=18.0),
            scan_buffer_km=25.0,
            simulation_source_ids=[str(src.id)],
        )
    assert result.verdict == "consistent"
    assert result.alignment_score >= 70.0
    assert result.anomaly_ppb == 18.0
    assert result.plume_extends_outside is True
    assert len(result.sources) == 1
    assert result.sources[0].verdict == "consistent"
    assert result.sources[0].bearing_delta_deg is not None
    assert result.sources[0].bearing_delta_deg <= 25.0


def test_fusion_no_signal_when_anomaly_missing():
    src = _source()
    with patch(
        "app.services.emissions.fusion.geography_to_geojson_geometry",
        return_value={"type": "Point", "coordinates": [77.2, 28.6]},
    ):
        result = assess_emission_fusion(
            sources=[src],  # type: ignore[list-item]
            dispersion_result=_dispersion_result(),
            scan_summary={"anomaly_ppb": None, "baseline_ppb": None, "latest_mean_ppb": None, "months": 0},
            scan_buffer_km=25.0,
            simulation_source_ids=[str(src.id)],
        )
    assert result.verdict == "no_signal"
    assert any(f.name == "no_anomaly_signal" for f in result.findings)


def test_fusion_misaligned_when_anomaly_positive_but_no_plume_outside():
    src = _source()
    with patch(
        "app.services.emissions.fusion.geography_to_geojson_geometry",
        return_value={"type": "Point", "coordinates": [77.2, 28.6]},
    ):
        result = assess_emission_fusion(
            sources=[src],  # type: ignore[list-item]
            dispersion_result=_dispersion_result(extends_outside=False),
            scan_summary=_scan_summary(anomaly=8.0),
            scan_buffer_km=25.0,
            simulation_source_ids=[],
        )
    assert result.verdict in {"uncertain", "misaligned"}
    assert result.alignment_score < 70.0


def test_fusion_result_json_serializable():
    src = _source()
    with patch(
        "app.services.emissions.fusion.geography_to_geojson_geometry",
        return_value={"type": "Point", "coordinates": [77.2, 28.6]},
    ):
        result = assess_emission_fusion(
            sources=[src],  # type: ignore[list-item]
            dispersion_result=_dispersion_result(),
            scan_summary=_scan_summary(),
            scan_buffer_km=25.0,
            simulation_source_ids=[str(src.id)],
        )
    payload = fusion_result_to_dict(result)
    EmissionFusionResultOut.model_validate(payload)


@pytest.mark.asyncio
async def test_run_emission_fusion_requires_scan_and_dispersion():
    class FakeDb:
        async def flush(self):
            return None

    db = FakeDb()
    user = SimpleNamespace(id=uuid.uuid4())

    with (
        patch(
            "app.services.emissions.dispersion.run.get_latest_dispersion",
            new=AsyncMock(return_value=None),
        ),
        pytest.raises(FusionError) as exc,
    ):
        await run_emission_fusion(
            db,  # type: ignore[arg-type]
            project_id=uuid.uuid4(),
            work_area_id=uuid.uuid4(),
            user=user,
        )
    assert exc.value.code == "fusion_requires_dispersion"


@pytest.fixture
def auth_client():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.organization_id = None
    user.role = "admin"

    async def _current_user():
        return user

    app.dependency_overrides[get_current_user] = _current_user
    yield user
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_emission_fusion_endpoint_returns_201(auth_client):
    project_id = uuid.uuid4()
    work_area_id = uuid.uuid4()
    assessment_id = uuid.uuid4()
    now = datetime.now(UTC)

    fusion_payload = fusion_result_to_dict(
        assess_emission_fusion(
            sources=[],
            dispersion_result=_dispersion_result(),
            scan_summary=_scan_summary(),
            scan_buffer_km=25.0,
            simulation_source_ids=[],
        )
    )

    assessment_row = SimpleNamespace(
        id=assessment_id,
        project_id=project_id,
        work_area_id=work_area_id,
        dispersion_simulation_id=uuid.uuid4(),
        satellite_scan_id=uuid.uuid4(),
        emission_source_ids=[],
        alignment_score=fusion_payload["alignment_score"],
        verdict=fusion_payload["verdict"],
        result=fusion_payload,
        status="complete",
        created_at=now,
        updated_at=now,
    )

    work_area = SimpleNamespace(id=work_area_id, project_id=project_id)
    project = SimpleNamespace(id=project_id)

    class FakeResult:
        def scalar_one_or_none(self):
            return work_area

    class FakeDb:
        async def execute(self, _query):
            return FakeResult()

        async def commit(self):
            return None

        async def refresh(self, _row):
            return None

    async def _db():
        return FakeDb()

    from app.api.v1 import deps

    app.dependency_overrides[deps.get_db] = _db

    with (
        patch("app.api.v1.emissions.load_project", new=AsyncMock(return_value=project)),
        patch(
            "app.api.v1.emissions.run_emission_fusion",
            new=AsyncMock(return_value=(assessment_row, None)),
        ),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/planting-projects/{project_id}/work-areas/{work_area_id}/emission-fusion",
            )

    app.dependency_overrides.pop(deps.get_db, None)

    assert response.status_code == 201
    body = response.json()
    assert body["verdict"] in {"consistent", "uncertain", "misaligned", "no_signal"}
    assert "alignment_score" in body["result"]
