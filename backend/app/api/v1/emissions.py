"""GHG / methane emission sources and dispersion simulations."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, ProgrammingError

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.models.emission_source import EmissionSatelliteScan
from app.models.plantation_fence import PlantationFence
from app.schemas.emissions import (
    DispersionMetOut,
    DispersionRunOut,
    DispersionRunRequest,
    EmissionSourceCreate,
    EmissionSourceOut,
    EmissionSourceUpdate,
    PlumeContourOut,
    TropomiScanOut,
    TropomiScanRequest,
)
from app.services.emissions.dispersion.run import (
    DispersionError,
    _simulation_to_out,
    get_latest_dispersion,
    load_sources_for_run,
    run_dispersion,
)
from app.services.emissions.registry import (
    EmissionRegistryError,
    create_emission_source,
    delete_emission_source,
    emission_source_to_dict,
    get_emission_source,
    list_emission_sources,
    update_emission_source,
)
from app.services.emissions.tropomi import (
    TropomiScanError,
    run_tropomi_scan,
    scan_to_dict,
    tropomi_configured,
)
from app.services.planting_projects.access import can_manage_project, load_project

router = APIRouter(prefix="/planting-projects", tags=["emissions"])


def _raise_emissions_db_error(exc: Exception) -> None:
    raw = str(getattr(exc, "orig", exc))
    if any(
        token in raw
        for token in (
            "emission_sources",
            "dispersion_simulations",
            "emission_satellite_scans",
        )
    ):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="emissions_migration_required",
        ) from exc


def _registry_error(exc: EmissionRegistryError) -> HTTPException:
    code = exc.code
    if code == "emission_outside_work_area":
        return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code)
    if code in {"work_area_not_found", "work_area_project_mismatch"}:
        return HTTPException(status.HTTP_404_NOT_FOUND, detail=code)
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail=code)


def _dispersion_error(exc: DispersionError) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail=exc.code)


def _tropomi_error(exc: TropomiScanError) -> HTTPException:
    code = exc.code
    if code == "sentinel_hub_not_configured":
        return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=code)
    if code in {"work_area_not_found", "work_area_project_mismatch"}:
        return HTTPException(status.HTTP_404_NOT_FOUND, detail=code)
    if code == "tropomi_no_data":
        return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code)
    return HTTPException(status.HTTP_502_BAD_GATEWAY, detail=code)


def _to_out(row) -> EmissionSourceOut:
    data = emission_source_to_dict(row)
    return EmissionSourceOut(**data)


@router.get("/{project_id}/emission-sources", response_model=list[EmissionSourceOut])
async def list_project_emission_sources(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    work_area_id: uuid.UUID | None = None,
) -> list[EmissionSourceOut]:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        rows = await list_emission_sources(db, project_id=project_id, work_area_id=work_area_id)
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise
    return [_to_out(r) for r in rows]


@router.post(
    "/{project_id}/emission-sources",
    response_model=EmissionSourceOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_project_emission_source(
    project_id: uuid.UUID,
    payload: EmissionSourceCreate,
    user: WriteAccess,
    db: DB,
) -> EmissionSourceOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    try:
        row = await create_emission_source(db, project_id=project_id, user=user, payload=payload)
    except EmissionRegistryError as exc:
        raise _registry_error(exc) from exc
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.patch("/{project_id}/emission-sources/{source_id}", response_model=EmissionSourceOut)
async def update_project_emission_source(
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    payload: EmissionSourceUpdate,
    user: WriteAccess,
    db: DB,
) -> EmissionSourceOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    row = await get_emission_source(db, project_id=project_id, source_id=source_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="emission_source_not_found")
    row = await update_emission_source(db, source=row, payload=payload)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.delete("/{project_id}/emission-sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_emission_source(
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    user: WriteAccess,
    db: DB,
) -> Response:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    row = await get_emission_source(db, project_id=project_id, source_id=source_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="emission_source_not_found")
    await delete_emission_source(db, row)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{project_id}/dispersion/run", response_model=DispersionRunOut)
async def run_project_dispersion(
    project_id: uuid.UUID,
    payload: DispersionRunRequest,
    user: CurrentUser,
    db: DB,
) -> DispersionRunOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    res = await db.execute(
        select(PlantationFence).where(PlantationFence.id == payload.work_area_id)
    )
    work_area = res.scalar_one_or_none()
    if work_area is None or work_area.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="work_area_not_found")

    try:
        sources = await load_sources_for_run(
            db, project_id=project_id, source_ids=payload.emission_source_ids
        )
        sim, result = await run_dispersion(
            db,
            project_id=project_id,
            user=user,
            payload=payload,
            work_area=work_area,
            sources=sources,
        )
    except DispersionError as exc:
        raise _dispersion_error(exc) from exc
    except EmissionRegistryError as exc:
        raise _registry_error(exc) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="met_fetch_failed") from exc
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise

    try:
        await db.commit()
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise
    met = DispersionMetOut.model_validate(sim.met_snapshot)
    return DispersionRunOut(
        simulation_id=sim.id,
        project_id=project_id,
        work_area_id=payload.work_area_id,
        gas_type=result["gas_type"],
        emission_rate_g_s=result["emission_rate_g_s"],
        wind_speed_ms=result["wind_speed_ms"],
        wind_direction_deg=result["wind_direction_deg"],
        stability_class=result["stability_class"],
        max_concentration_ug_m3=result["max_concentration_ug_m3"],
        downwind_km=result["downwind_km"],
        crosswind_km=result["crosswind_km"],
        inside_boundary=result["inside_boundary"],
        downwind_impact=result["downwind_impact"],
        contours=[PlumeContourOut(**c) for c in result["contours"]],
        met_snapshot=met,
    )


@router.get("/{project_id}/dispersion/latest", response_model=DispersionRunOut | None)
async def get_latest_project_dispersion(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    work_area_id: uuid.UUID,
) -> DispersionRunOut | None:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        sim = await get_latest_dispersion(db, project_id=project_id, work_area_id=work_area_id)
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise
    if sim is None:
        return None
    data = _simulation_to_out(sim, project_id)
    return DispersionRunOut(
        **{
            **data,
            "contours": [PlumeContourOut(**c) for c in data["contours"]],
        }
    )


@router.post(
    "/{project_id}/work-areas/{work_area_id}/satellite-scan",
    response_model=TropomiScanOut,
    status_code=status.HTTP_201_CREATED,
)
async def run_work_area_satellite_scan(
    project_id: uuid.UUID,
    work_area_id: uuid.UUID,
    payload: TropomiScanRequest,
    user: CurrentUser,
    db: DB,
) -> TropomiScanOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not tropomi_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="sentinel_hub_not_configured")

    res = await db.execute(select(PlantationFence).where(PlantationFence.id == work_area_id))
    work_area = res.scalar_one_or_none()
    if work_area is None or work_area.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="work_area_not_found")

    try:
        row = await run_tropomi_scan(
            db,
            project_id=project_id,
            work_area=work_area,
            user=user,
            months=payload.months,
            buffer_km=payload.buffer_km,
        )
    except TropomiScanError as exc:
        raise _tropomi_error(exc) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_work_area_geometry") from exc
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise

    try:
        await db.commit()
        await db.refresh(row)
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise
    return TropomiScanOut(**scan_to_dict(row))


@router.get(
    "/{project_id}/work-areas/{work_area_id}/satellite-scans",
    response_model=list[TropomiScanOut],
)
async def list_work_area_satellite_scans(
    project_id: uuid.UUID,
    work_area_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    limit: int = 10,
) -> list[TropomiScanOut]:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    res = await db.execute(select(PlantationFence).where(PlantationFence.id == work_area_id))
    work_area = res.scalar_one_or_none()
    if work_area is None or work_area.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="work_area_not_found")

    try:
        rows_res = await db.execute(
            select(EmissionSatelliteScan)
            .where(
                EmissionSatelliteScan.project_id == project_id,
                EmissionSatelliteScan.work_area_id == work_area_id,
            )
            .order_by(EmissionSatelliteScan.created_at.desc())
            .limit(min(limit, 50))
        )
        rows = rows_res.scalars().all()
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_emissions_db_error(exc)
        raise
    return [TropomiScanOut(**scan_to_dict(r)) for r in rows]
