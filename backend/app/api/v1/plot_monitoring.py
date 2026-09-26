"""Plot-based stratified monitoring API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.core.security import Permission, Role, has_permission
from app.schemas.plot_monitoring import (
    PlotMonitoringDesignUpsert,
    PlotMonitoringSummaryOut,
    PlotVisitCreate,
)
from app.services.audit import record_audit
from app.services.planting_projects.access import can_manage_project, load_project
from app.services.plot_monitoring.layout import generate_plots_for_design
from app.services.plot_monitoring.ops import (
    design_summary,
    list_plots,
    record_plot_visit,
    upsert_design,
)

router = APIRouter(prefix="/plot-monitoring", tags=["plot-monitoring"])


async def _require_supervisor_or_admin(user: CurrentUser) -> None:
    if has_permission(user.role, Permission.ADMIN_ALL):
        return
    if user.role in {Role.FIELD_SUPERVISOR.value, Role.GOVERNMENT.value, Role.NGO.value}:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="supervisor_required")


@router.get("/projects/{project_id}/summary", response_model=PlotMonitoringSummaryOut)
async def get_plot_monitoring_summary(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> PlotMonitoringSummaryOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    return PlotMonitoringSummaryOut.model_validate(await design_summary(db, project.id))


@router.put("/projects/{project_id}/design", response_model=PlotMonitoringSummaryOut)
async def upsert_plot_monitoring_design(
    project_id: uuid.UUID,
    payload: PlotMonitoringDesignUpsert,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> PlotMonitoringSummaryOut:
    await _require_supervisor_or_admin(user)
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    await upsert_design(
        db,
        project_id=project.id,
        mode=payload.mode,
        stratification=payload.stratification,
        plots_per_stratum=payload.plots_per_stratum,
        plot_area_m2=payload.plot_area_m2,
        created_by=user.id,
    )
    await record_audit(
        db,
        actor=user,
        action="plot_monitoring.design.upsert",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={"mode": payload.mode, "stratification": payload.stratification},
    )
    return PlotMonitoringSummaryOut.model_validate(await design_summary(db, project.id))


@router.post("/projects/{project_id}/generate-plots", response_model=PlotMonitoringSummaryOut)
async def generate_project_plots(
    project_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> PlotMonitoringSummaryOut:
    await _require_supervisor_or_admin(user)
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    from app.services.plot_monitoring.ops import get_or_create_design

    design = await get_or_create_design(db, project_id=project.id, created_by=user.id)
    if design.mode == "full_census":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="switch_to_plot_based_mode_first",
        )
    await generate_plots_for_design(db, design)
    await record_audit(
        db,
        actor=user,
        action="plot_monitoring.plots.generate",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={"project_id": str(project.id)},
    )
    return PlotMonitoringSummaryOut.model_validate(await design_summary(db, project.id))


@router.get("/projects/{project_id}/plots")
async def get_project_plots(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> list[dict]:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    return await list_plots(db, project.id)


@router.post("/plots/{plot_id}/visits")
async def create_plot_visit(
    plot_id: uuid.UUID,
    payload: PlotVisitCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> dict:
    try:
        visit = await record_plot_visit(
            db,
            plot_id=plot_id,
            visitor_id=user.id,
            observations=[o.model_dump() for o in payload.observations],
            notes=payload.notes,
            gps_accuracy_m=payload.gps_accuracy_m,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="plot_monitoring.visit.create",
        resource_type="plot_visit",
        resource_id=visit.id,
        request=request,
        diff={"observation_count": len(payload.observations)},
    )
    return {"id": str(visit.id), "plot_id": str(visit.plot_id), "status": visit.status}
