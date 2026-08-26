"""Orchestrate dispersion simulation runs."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emission_source import DispersionSimulation, EmissionSource
from app.models.plantation_fence import PlantationFence
from app.schemas.emissions import DispersionRunRequest
from app.services.emissions.dispersion.gaussian import run_gaussian_plume
from app.services.emissions.registry import (
    effective_emission_rate_g_s,
    get_emission_source,
)
from app.services.geo import (
    geography_to_geojson_geometry,
    geography_to_geojson_polygon,
    point_lat_lon,
)
from app.services.weather.dispersion_met import fetch_dispersion_met


class DispersionError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _source_point_geometry(source: EmissionSource) -> dict:
    geom = geography_to_geojson_geometry(source.location)
    if geom["type"] == "Point":
        return geom
    # Area source — use centroid as release point for Gaussian v1.
    from app.services.geo import polygon_centroid

    lat, lon = polygon_centroid(geom)
    return {"type": "Point", "coordinates": [lon, lat]}


async def run_dispersion(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    user,
    payload: DispersionRunRequest,
    work_area: PlantationFence,
    sources: list[EmissionSource],
) -> tuple[DispersionSimulation, dict]:
    if work_area.project_id != project_id:
        raise DispersionError("work_area_project_mismatch")
    if not sources:
        raise DispersionError("no_emission_sources")

    primary = sources[0]
    for src in sources:
        if src.work_area_id != payload.work_area_id:
            raise DispersionError("source_work_area_mismatch")
        if src.status != "active":
            raise DispersionError("source_inactive")

    point = _source_point_geometry(primary)
    lat, lon = point_lat_lon(point)
    met = await fetch_dispersion_met(lat, lon, hours=payload.duration_hours)
    hour_idx = min(payload.met_hour_index, len(met.hours) - 1)
    hour = met.hours[hour_idx]

    total_rate = sum(effective_emission_rate_g_s(s) for s in sources)
    work_area_geo = geography_to_geojson_polygon(work_area.boundary)

    result = run_gaussian_plume(
        source_point=point,
        work_area_polygon=work_area_geo,
        emission_rate_g_s=total_rate,
        release_height_m=float(primary.release_height_m),
        wind_speed_ms=hour.wind_speed_ms,
        wind_direction_deg=hour.wind_direction_deg,
        stability_class=hour.stability_class,
        downwind_km=payload.downwind_km,
        crosswind_km=payload.crosswind_km,
        gas_type=primary.gas_type,
    )

    sim = DispersionSimulation(
        project_id=project_id,
        work_area_id=payload.work_area_id,
        emission_source_ids=[str(s.id) for s in sources],
        duration_hours=payload.duration_hours,
        met_provider=met.provider,
        met_snapshot=met.model_dump(mode="json"),
        result=result,
        status="complete",
        created_by=user.id,
    )
    db.add(sim)
    await db.flush()
    return sim, result


async def load_sources_for_run(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    source_ids: list[uuid.UUID],
) -> list[EmissionSource]:
    rows: list[EmissionSource] = []
    for sid in source_ids:
        row = await get_emission_source(db, project_id=project_id, source_id=sid)
        if row is None:
            raise DispersionError("emission_source_not_found")
        rows.append(row)
    return rows
