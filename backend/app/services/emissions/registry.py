"""Emission source registry — CRUD with work-area boundary enforcement."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emission_source import EmissionSource
from app.models.plantation_fence import PlantationFence
from app.schemas.emissions import EmissionSourceCreate, EmissionSourceUpdate
from app.services.emissions.constants import DEFAULT_RELEASE_HEIGHT_M
from app.services.geo import geography_to_geojson_geometry, geojson_geometry_to_wkt


class EmissionRegistryError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _geometry_from_payload(payload: EmissionSourceCreate) -> tuple[str, str]:
    if payload.geometry_kind == "point":
        assert payload.point is not None
        wkt = geojson_geometry_to_wkt(payload.point.model_dump())
        return wkt, "point"
    assert payload.area is not None
    wkt = geojson_geometry_to_wkt(payload.area.model_dump())
    return wkt, "area"


def effective_emission_rate_g_s(source: EmissionSource) -> float:
    if source.emission_rate_g_s is not None:
        return float(source.emission_rate_g_s)
    if source.annual_emission_tons is not None:
        # Convert t/yr → g/s (approximate continuous release).
        return float(source.annual_emission_tons) * 1_000_000.0 / (365.25 * 86400.0)
    raise EmissionRegistryError("emission_rate_missing")


async def _assert_within_work_area(
    db: AsyncSession,
    *,
    work_area_id: uuid.UUID,
    geom_wkt: str,
) -> PlantationFence:
    res = await db.execute(select(PlantationFence).where(PlantationFence.id == work_area_id))
    fence = res.scalar_one_or_none()
    if fence is None:
        raise EmissionRegistryError("work_area_not_found")
    covers = await db.execute(
        select(func.ST_Covers(fence.boundary, func.ST_GeogFromText(geom_wkt)))
    )
    if not covers.scalar_one():
        raise EmissionRegistryError("emission_outside_work_area")
    return fence


async def create_emission_source(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    user,
    payload: EmissionSourceCreate,
) -> EmissionSource:
    if payload.work_area_id is None:
        raise EmissionRegistryError("work_area_required")
    geom_wkt, kind = _geometry_from_payload(payload)
    fence = await _assert_within_work_area(db, work_area_id=payload.work_area_id, geom_wkt=geom_wkt)
    if fence.project_id != project_id:
        raise EmissionRegistryError("work_area_project_mismatch")

    row = EmissionSource(
        project_id=project_id,
        work_area_id=payload.work_area_id,
        name=payload.name.strip(),
        source_type=payload.source_type,
        gas_type=payload.gas_type,
        geometry_kind=kind,
        location=geom_wkt,
        emission_rate_g_s=payload.emission_rate_g_s,
        annual_emission_tons=payload.annual_emission_tons,
        release_height_m=payload.release_height_m or DEFAULT_RELEASE_HEIGHT_M,
        owner_user_id=user.id,
        organization_id=user.organization_id or fence.organization_id,
        metadata_=payload.metadata,
    )
    db.add(row)
    await db.flush()
    return row


async def list_emission_sources(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    work_area_id: uuid.UUID | None = None,
    gas_type: str | None = None,
) -> list[EmissionSource]:
    stmt = select(EmissionSource).where(EmissionSource.project_id == project_id)
    if work_area_id is not None:
        stmt = stmt.where(EmissionSource.work_area_id == work_area_id)
    if gas_type is not None:
        stmt = stmt.where(EmissionSource.gas_type == gas_type)
    stmt = stmt.order_by(EmissionSource.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_emission_source(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    source_id: uuid.UUID,
) -> EmissionSource | None:
    res = await db.execute(
        select(EmissionSource).where(
            EmissionSource.id == source_id,
            EmissionSource.project_id == project_id,
        )
    )
    return res.scalar_one_or_none()


async def update_emission_source(
    db: AsyncSession,
    *,
    source: EmissionSource,
    payload: EmissionSourceUpdate,
) -> EmissionSource:
    if payload.name is not None:
        source.name = payload.name.strip()
    if payload.source_type is not None:
        source.source_type = payload.source_type
    if payload.gas_type is not None:
        source.gas_type = payload.gas_type
    if payload.emission_rate_g_s is not None:
        source.emission_rate_g_s = payload.emission_rate_g_s
    if payload.annual_emission_tons is not None:
        source.annual_emission_tons = payload.annual_emission_tons
    if payload.release_height_m is not None:
        source.release_height_m = payload.release_height_m
    if payload.status is not None:
        source.status = payload.status
    if payload.metadata is not None:
        source.metadata_ = payload.metadata
    await db.flush()
    return source


async def delete_emission_source(db: AsyncSession, source: EmissionSource) -> None:
    await db.delete(source)


def emission_source_to_dict(source: EmissionSource) -> dict[str, Any]:
    return {
        "id": source.id,
        "project_id": source.project_id,
        "work_area_id": source.work_area_id,
        "name": source.name,
        "source_type": source.source_type,
        "gas_type": source.gas_type,
        "geometry_kind": source.geometry_kind,
        "geometry": geography_to_geojson_geometry(source.location),
        "emission_rate_g_s": float(source.emission_rate_g_s)
        if source.emission_rate_g_s is not None
        else None,
        "annual_emission_tons": float(source.annual_emission_tons)
        if source.annual_emission_tons is not None
        else None,
        "release_height_m": float(source.release_height_m),
        "status": source.status,
        "metadata": source.metadata_ or {},
        "created_at": source.created_at,
        "updated_at": source.updated_at,
    }
