"""Planting projects, work areas, standards, and compliance APIs."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.v1.deps import DB, CurrentUser
from app.models.planting_project import PlantingProject
from app.models.planting_standard import PlantingStandard
from app.models.plantation_fence import PlantationFence
from app.models.tree import Tree
from app.schemas.common import Page
from app.schemas.plantation_fence import GeoJsonPolygon
from app.schemas.planting_project import (
    ComplianceCheckOut,
    ComplianceCheckRequest,
    ComplianceIssueOut,
    PlantingProjectCreate,
    PlantingProjectOut,
    PlantingProjectUpdate,
    PlantingStandardOut,
    ProjectSummaryOut,
    StandardTemplateOut,
    WorkAreaCreate,
    WorkAreaOut,
    GeoJsonLineString,
)
from app.services.geo import geography_to_geojson_polygon
from app.services.planting_projects.access import can_access_project, load_project
from app.services.planting_projects.compliance import evaluate_tree_placement
from app.services.planting_projects.constants import (
    PROGRAM_DEFAULT_COMPLIANCE,
    PROGRAM_DEFAULT_SEGMENT,
    SEGMENT_LABELS,
)
from app.services.planting_projects.service import (
    create_standard_from_template,
    get_active_standard,
    project_summary,
)
from app.services.planting_projects.templates import get_template, list_templates
from app.services.planting_projects.work_area_geometry import resolve_work_area_geometry

router = APIRouter(prefix="/planting-projects", tags=["planting-projects"])

MAX_FENCE_AREA_HA = 5000.0


def _project_out(
    project: PlantingProject,
    *,
    summary: ProjectSummaryOut | None = None,
    standard: PlantingStandard | None = None,
) -> PlantingProjectOut:
    return PlantingProjectOut(
        id=project.id,
        code=project.code,
        name=project.name,
        description=project.description,
        segment=project.segment,
        compliance_mode=project.compliance_mode,
        status=project.status,
        program_code=project.program_code,
        standard_template_code=project.standard_template_code,
        target_tree_count=project.target_tree_count,
        organization_id=project.organization_id,
        owner_user_id=project.owner_user_id,
        metadata=project.metadata_ or {},
        created_at=project.created_at,
        updated_at=project.updated_at,
        summary=summary,
        active_standard=PlantingStandardOut.model_validate(standard) if standard else None,
    )


async def _work_area_out(db: DB, fence: PlantationFence) -> WorkAreaOut:
    boundary = GeoJsonPolygon.model_validate(geography_to_geojson_polygon(fence.boundary))
    source = (fence.metadata_ or {}).get("source_geometry")
    centerline = GeoJsonLineString.model_validate(source) if source else None
    tree_count = int(
        (
            await db.execute(
                select(func.count()).where(
                    Tree.plantation_id == fence.id,
                    Tree.status != "removed",
                )
            )
        ).scalar_one()
        or 0
    )
    return WorkAreaOut(
        id=fence.id,
        project_id=fence.project_id,
        name=fence.name,
        geometry_type=fence.geometry_type,
        buffer_m=float(fence.buffer_m) if fence.buffer_m is not None else None,
        segment_code=fence.segment_code,
        chainage_start_km=float(fence.chainage_start_km)
        if fence.chainage_start_km is not None
        else None,
        chainage_end_km=float(fence.chainage_end_km)
        if fence.chainage_end_km is not None
        else None,
        area_ha=float(fence.area_ha) if fence.area_ha is not None else None,
        boundary=boundary,
        centerline=centerline,
        tree_count=tree_count,
        last_satellite_at=fence.last_satellite_at,
        created_at=fence.created_at,
        updated_at=fence.updated_at,
    )


@router.get("/segments")
async def list_segments() -> dict:
    return {
        "segments": [
            {"code": code, "label": label} for code, label in SEGMENT_LABELS.items()
        ]
    }


@router.get("/templates", response_model=list[StandardTemplateOut])
async def list_standard_templates(segment: str | None = None) -> list[StandardTemplateOut]:
    return [StandardTemplateOut.model_validate(t) for t in list_templates(segment=segment)]


@router.get("/templates/{code}", response_model=StandardTemplateOut)
async def get_standard_template(code: str) -> StandardTemplateOut:
    tpl = get_template(code)
    if tpl is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")
    return StandardTemplateOut.model_validate(tpl)


@router.get("", response_model=Page[PlantingProjectOut])
async def list_projects(
    user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    segment: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
) -> Page[PlantingProjectOut]:
    stmt = select(PlantingProject)
    if user.role != "admin":
        if user.organization_id:
            stmt = stmt.where(
                (PlantingProject.owner_user_id == user.id)
                | (PlantingProject.organization_id == user.organization_id)
            )
        else:
            stmt = stmt.where(PlantingProject.owner_user_id == user.id)
    if segment:
        stmt = stmt.where(PlantingProject.segment == segment)
    if status_filter:
        stmt = stmt.where(PlantingProject.status == status_filter)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (
        await db.execute(
            stmt.order_by(PlantingProject.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items: list[PlantingProjectOut] = []
    for project in rows:
        summary = ProjectSummaryOut.model_validate(await project_summary(db, project))
        standard = await get_active_standard(db, project)
        items.append(_project_out(project, summary=summary, standard=standard))

    return Page(items=items, page=page, page_size=page_size, total=total or 0)


@router.post("", response_model=PlantingProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: PlantingProjectCreate, user: CurrentUser, db: DB
) -> PlantingProjectOut:
    segment = payload.segment
    if payload.program_code and segment == "general":
        segment = PROGRAM_DEFAULT_SEGMENT.get(payload.program_code, segment)

    compliance_mode = payload.compliance_mode
    if payload.program_code and compliance_mode == "guided":
        compliance_mode = PROGRAM_DEFAULT_COMPLIANCE.get(payload.program_code, compliance_mode)

    template_code = payload.standard_template_code
    if not template_code:
        from app.services.planting_projects.templates import template_for_segment

        template_code = template_for_segment(segment)["code"]

    dup_stmt = select(PlantingProject).where(PlantingProject.code == payload.code)
    if user.organization_id:
        dup_stmt = dup_stmt.where(PlantingProject.organization_id == user.organization_id)
    else:
        dup_stmt = dup_stmt.where(PlantingProject.owner_user_id == user.id)
    existing = await db.execute(dup_stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="project_code_exists")

    project = PlantingProject(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        segment=segment,
        compliance_mode=compliance_mode,
        program_code=payload.program_code,
        standard_template_code=template_code,
        target_tree_count=payload.target_tree_count,
        organization_id=user.organization_id,
        owner_user_id=user.id,
        metadata_=payload.metadata,
        status="planning",
    )
    db.add(project)
    await db.flush()
    await create_standard_from_template(db, project=project, template_code=template_code)
    await db.commit()
    await db.refresh(project)

    summary = ProjectSummaryOut.model_validate(await project_summary(db, project))
    standard = await get_active_standard(db, project)
    return _project_out(project, summary=summary, standard=standard)


@router.get("/{project_id}", response_model=PlantingProjectOut)
async def get_project(project_id: uuid.UUID, user: CurrentUser, db: DB) -> PlantingProjectOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    summary = ProjectSummaryOut.model_validate(await project_summary(db, project))
    standard = await get_active_standard(db, project)
    return _project_out(project, summary=summary, standard=standard)


@router.patch("/{project_id}", response_model=PlantingProjectOut)
async def update_project(
    project_id: uuid.UUID,
    payload: PlantingProjectUpdate,
    user: CurrentUser,
    db: DB,
) -> PlantingProjectOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    for field in ("name", "description", "status", "compliance_mode", "target_tree_count"):
        value = getattr(payload, field)
        if value is not None:
            setattr(project, field, value)
    if payload.metadata is not None:
        project.metadata_ = payload.metadata

    await db.commit()
    await db.refresh(project)
    summary = ProjectSummaryOut.model_validate(await project_summary(db, project))
    standard = await get_active_standard(db, project)
    return _project_out(project, summary=summary, standard=standard)


@router.get("/{project_id}/work-areas", response_model=list[WorkAreaOut])
async def list_work_areas(
    project_id: uuid.UUID, user: CurrentUser, db: DB
) -> list[WorkAreaOut]:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    res = await db.execute(
        select(PlantationFence)
        .where(PlantationFence.project_id == project.id)
        .order_by(PlantationFence.created_at.desc())
    )
    fences = list(res.scalars().all())
    return [await _work_area_out(db, fence) for fence in fences]


@router.post(
    "/{project_id}/work-areas",
    response_model=WorkAreaOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_work_area(
    project_id: uuid.UUID,
    payload: WorkAreaCreate,
    user: CurrentUser,
    db: DB,
) -> WorkAreaOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    try:
        wkt, meta_updates = resolve_work_area_geometry(payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    standard = await get_active_standard(db, project)
    fence = PlantationFence(
        name=payload.name,
        project_id=project.id,
        planting_standard_id=payload.planting_standard_id or (standard.id if standard else None),
        geometry_type=payload.geometry_type,
        buffer_m=payload.buffer_m,
        chainage_start_km=payload.chainage_start_km,
        chainage_end_km=payload.chainage_end_km,
        segment_code=payload.segment_code,
        owner_user_id=user.id,
        organization_id=user.organization_id or project.organization_id,
        boundary=wkt,
        metadata_=meta_updates,
    )
    db.add(fence)
    await db.flush()

    area_res = await db.execute(
        select(func.ST_Area(func.ST_GeogFromText(wkt)) / 10000.0)
    )
    area_ha = round(float(area_res.scalar_one()), 4)
    if area_ha > MAX_FENCE_AREA_HA:
        await db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"work_area_too_large:{area_ha:.1f}ha",
        )
    fence.area_ha = area_ha

    if project.status == "planning":
        project.status = "active"

    await db.commit()
    await db.refresh(fence)
    return await _work_area_out(db, fence)


@router.post("/{project_id}/compliance-check", response_model=ComplianceCheckOut)
async def compliance_check(
    project_id: uuid.UUID,
    payload: ComplianceCheckRequest,
    user: CurrentUser,
    db: DB,
) -> ComplianceCheckOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    res = await db.execute(
        select(PlantationFence).where(
            PlantationFence.id == payload.work_area_id,
            PlantationFence.project_id == project.id,
        )
    )
    work_area = res.scalar_one_or_none()
    if work_area is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="work_area_not_found")

    standard = await get_active_standard(db, project)
    rules = standard.rules if standard else {}
    result = await evaluate_tree_placement(
        db,
        project=project,
        work_area=work_area,
        rules=rules,
        compliance_mode=project.compliance_mode,  # type: ignore[arg-type]
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy_m=payload.accuracy_m,
        species_text=payload.species_text,
        photo_count=payload.photo_count,
        metadata=payload.metadata,
    )
    return ComplianceCheckOut(
        passed=result.passed,
        mode=result.mode,
        chainage_km=result.chainage_km,
        issues=[ComplianceIssueOut.model_validate(i.__dict__) for i in result.issues],
    )
