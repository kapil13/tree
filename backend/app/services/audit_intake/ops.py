"""Audit engagement CRUD and intake operations."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import (
    AuditEngagement,
    BoundaryVersion,
    ClaimDocument,
    GisValidationRun,
    PlantabilityExclusion,
    PlausibilityAssessment,
)
from app.models.planting_project import PlantingProject
from app.services.audit_intake.claim_snapshot import (
    freeze_claim_snapshot,
    get_working_claim,
    latest_snapshot,
    update_working_claim,
)
from app.services.audit_intake.gis_validation import validate_boundaries
from app.services.audit_intake.intake_gate import evaluate_intake_gate
from app.services.audit_intake.kml_import import parse_upload
from app.services.audit_intake.plausibility import assess_block_plausibility
from app.services.geo import geojson_polygon_to_wkt, geography_to_geojson_polygon

ALLOWED_DOC_TYPES = frozenset(
    [
        "work_order",
        "planting_certificate",
        "third_party_report",
        "tenure_reference",
        "other",
    ]
)

ALLOWED_EXCLUSION_TYPES = frozenset(["road", "water", "building", "rock", "other"])


async def get_engagement_by_project(
    db: AsyncSession, project_id: uuid.UUID
) -> AuditEngagement | None:
    row = await db.execute(
        select(AuditEngagement).where(AuditEngagement.project_id == project_id)
    )
    return row.scalar_one_or_none()


async def get_or_create_engagement(
    db: AsyncSession,
    project: PlantingProject,
    *,
    created_by_user_id: uuid.UUID | None,
) -> AuditEngagement:
    existing = await get_engagement_by_project(db, project.id)
    if existing:
        return existing
    engagement = AuditEngagement(
        project_id=project.id,
        organization_id=project.organization_id,
        status="draft",
        created_by_user_id=created_by_user_id,
        metadata_={},
    )
    db.add(engagement)
    await db.flush()
    return engagement


async def _measure_area_ha(db: AsyncSession, wkt: str) -> float:
    res = await db.execute(select(func.ST_Area(func.ST_GeogFromText(wkt)) / 10000.0))
    return round(float(res.scalar_one()), 4)


def _boundary_out(bv: BoundaryVersion) -> dict[str, Any]:
    return {
        "id": bv.id,
        "name": bv.name,
        "block_type": bv.block_type,
        "source": bv.source,
        "boundary": geography_to_geojson_polygon(bv.boundary),
        "area_ha_claimed": float(bv.area_ha_claimed) if bv.area_ha_claimed is not None else None,
        "area_ha_measured": float(bv.area_ha_measured) if bv.area_ha_measured is not None else None,
        "fence_id": bv.fence_id,
        "metadata": bv.metadata_ or {},
        "created_at": bv.created_at,
    }


def _exclusion_out(ex: PlantabilityExclusion) -> dict[str, Any]:
    return {
        "id": ex.id,
        "exclusion_type": ex.exclusion_type,
        "name": ex.name,
        "boundary": geography_to_geojson_polygon(ex.boundary),
        "area_ha": float(ex.area_ha) if ex.area_ha is not None else None,
        "metadata": ex.metadata_ or {},
        "created_at": ex.created_at,
    }


async def engagement_summary(db: AsyncSession, engagement: AuditEngagement) -> dict[str, Any]:
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    documents = (
        await db.execute(
            select(ClaimDocument).where(ClaimDocument.engagement_id == engagement.id)
        )
    ).scalars().all()
    exclusions = (
        await db.execute(
            select(PlantabilityExclusion).where(
                PlantabilityExclusion.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    snapshot = await latest_snapshot(db, engagement.id)
    working_claim = await get_working_claim(engagement)

    return {
        "id": engagement.id,
        "project_id": engagement.project_id,
        "status": engagement.status,
        "intake_completed_at": engagement.intake_completed_at,
        "working_claim": working_claim,
        "latest_snapshot": snapshot,
        "boundary_count": len(boundaries),
        "document_count": len(documents),
        "exclusion_count": len(exclusions),
        "created_at": engagement.created_at,
        "updated_at": engagement.updated_at,
    }


async def engagement_detail(
    db: AsyncSession, engagement: AuditEngagement, project: PlantingProject
) -> dict[str, Any]:
    summary = await engagement_summary(db, engagement)
    boundaries = (
        await db.execute(
            select(BoundaryVersion)
            .where(BoundaryVersion.engagement_id == engagement.id)
            .order_by(BoundaryVersion.created_at.asc())
        )
    ).scalars().all()
    documents = (
        await db.execute(
            select(ClaimDocument)
            .where(ClaimDocument.engagement_id == engagement.id)
            .order_by(ClaimDocument.created_at.desc())
        )
    ).scalars().all()
    exclusions = (
        await db.execute(
            select(PlantabilityExclusion)
            .where(PlantabilityExclusion.engagement_id == engagement.id)
            .order_by(PlantabilityExclusion.created_at.asc())
        )
    ).scalars().all()
    plausibility = (
        await db.execute(
            select(PlausibilityAssessment).where(
                PlausibilityAssessment.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    gis_run = (
        await db.execute(
            select(GisValidationRun)
            .where(GisValidationRun.engagement_id == engagement.id)
            .order_by(GisValidationRun.run_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    boundary_map = {b.id: b.name for b in boundaries}
    snapshot = summary.pop("latest_snapshot")
    summary["latest_snapshot"] = snapshot
    summary["boundaries"] = [_boundary_out(b) for b in boundaries]
    summary["documents"] = [
        {
            "id": d.id,
            "doc_type": d.doc_type,
            "title": d.title,
            "s3_key": d.s3_key,
            "metadata": d.doc_metadata or {},
            "uploaded_by_user_id": d.uploaded_by_user_id,
            "created_at": d.created_at,
        }
        for d in documents
    ]
    summary["exclusions"] = [_exclusion_out(e) for e in exclusions]
    summary["plausibility"] = [
        {
            "id": p.id,
            "boundary_version_id": p.boundary_version_id,
            "boundary_name": boundary_map.get(p.boundary_version_id),
            "verdict": p.verdict,
            "epistemic_label": p.epistemic_label,
            "summary": p.summary,
            "signals": p.signals or {},
            "assessed_at": p.assessed_at,
        }
        for p in plausibility
    ]
    summary["latest_gis_validation"] = (
        {
            "id": gis_run.id,
            "status": gis_run.status,
            "checks": gis_run.checks or {},
            "issues": gis_run.issues or [],
            "run_at": gis_run.run_at,
        }
        if gis_run
        else None
    )

    gate = evaluate_intake_gate(
        engagement,
        boundary_count=len(boundaries),
        document_count=len(documents),
        has_frozen_snapshot=snapshot is not None,
        gis_status=gis_run.status if gis_run else None,
        plausibility_assessed=len(plausibility),
    )
    summary["intake_gate"] = gate
    return summary


async def create_boundary(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    name: str,
    boundary_geojson: dict[str, Any],
    block_type: str | None = None,
    area_ha_claimed: float | None = None,
    source: str = "drawn",
    fence_id: uuid.UUID | None = None,
) -> BoundaryVersion:
    wkt = geojson_polygon_to_wkt(boundary_geojson)
    area_ha_measured = await _measure_area_ha(db, wkt)
    bv = BoundaryVersion(
        engagement_id=engagement.id,
        fence_id=fence_id,
        source=source,
        name=name.strip() or "Block",
        block_type=block_type,
        boundary=WKTElement(wkt, srid=4326),
        area_ha_claimed=area_ha_claimed,
        area_ha_measured=area_ha_measured,
        metadata_={},
    )
    db.add(bv)
    await db.flush()
    return bv


async def import_kml(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    filename: str,
    data: bytes,
) -> list[BoundaryVersion]:
    placemarks = parse_upload(filename, data)
    if not placemarks:
        raise ValueError("no_polygons_found")
    created: list[BoundaryVersion] = []
    for pm in placemarks:
        bv = await create_boundary(
            db,
            engagement,
            name=pm["name"],
            boundary_geojson=pm["geometry"],
            source="claim_import",
        )
        created.append(bv)
    return created


async def create_exclusion(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    exclusion_type: str,
    name: str,
    boundary_geojson: dict[str, Any],
) -> PlantabilityExclusion:
    if exclusion_type not in ALLOWED_EXCLUSION_TYPES:
        raise ValueError("invalid_exclusion_type")
    wkt = geojson_polygon_to_wkt(boundary_geojson)
    area_ha = await _measure_area_ha(db, wkt)
    ex = PlantabilityExclusion(
        engagement_id=engagement.id,
        exclusion_type=exclusion_type,
        name=name.strip() or exclusion_type,
        boundary=WKTElement(wkt, srid=4326),
        area_ha=area_ha,
        metadata_={},
    )
    db.add(ex)
    await db.flush()
    return ex


async def create_claim_document(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    doc_type: str,
    title: str,
    s3_key: str,
    uploaded_by_user_id: uuid.UUID | None,
    metadata: dict[str, Any] | None = None,
) -> ClaimDocument:
    if doc_type not in ALLOWED_DOC_TYPES:
        raise ValueError("invalid_doc_type")
    doc = ClaimDocument(
        engagement_id=engagement.id,
        doc_type=doc_type,
        title=title.strip() or doc_type,
        s3_key=s3_key,
        doc_metadata=metadata or {},
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(doc)
    await db.flush()
    return doc


async def run_gis_validation(db: AsyncSession, engagement: AuditEngagement) -> GisValidationRun:
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    exclusions = (
        await db.execute(
            select(PlantabilityExclusion).where(
                PlantabilityExclusion.engagement_id == engagement.id
            )
        )
    ).scalars().all()

    boundary_payload = [
        {
            "id": str(b.id),
            "name": b.name,
            "geometry": geography_to_geojson_polygon(b.boundary),
            "area_ha_claimed": float(b.area_ha_claimed) if b.area_ha_claimed else None,
            "area_ha_measured": float(b.area_ha_measured) if b.area_ha_measured else None,
        }
        for b in boundaries
    ]
    exclusion_payload = [
        {
            "id": str(e.id),
            "name": e.name,
            "geometry": geography_to_geojson_polygon(e.boundary),
        }
        for e in exclusions
    ]

    result = validate_boundaries(boundary_payload, exclusion_payload)
    run = GisValidationRun(
        engagement_id=engagement.id,
        status=result["status"],
        checks=result["checks"],
        issues=result["issues"],
        run_at=datetime.now(UTC),
    )
    db.add(run)
    await db.flush()
    return run


async def run_plausibility(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
) -> list[PlausibilityAssessment]:
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    working_claim = await get_working_claim(engagement)
    trees_claimed = working_claim.get("trees_claimed")
    density_per_ha = working_claim.get("density_per_ha")

    results: list[PlausibilityAssessment] = []
    for bv in boundaries:
        assessment = assess_block_plausibility(
            block_name=bv.name,
            area_ha_measured=float(bv.area_ha_measured) if bv.area_ha_measured else None,
            area_ha_claimed=float(bv.area_ha_claimed) if bv.area_ha_claimed else None,
            trees_claimed=int(trees_claimed) if trees_claimed is not None else None,
            density_per_ha=float(density_per_ha) if density_per_ha is not None else None,
            template_code=project.standard_template_code,
        )

        existing = (
            await db.execute(
                select(PlausibilityAssessment).where(
                    PlausibilityAssessment.engagement_id == engagement.id,
                    PlausibilityAssessment.boundary_version_id == bv.id,
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.verdict = assessment["verdict"]
            existing.summary = assessment["summary"]
            existing.signals = assessment["signals"]
            existing.epistemic_label = assessment["epistemic_label"]
            existing.assessed_at = datetime.now(UTC)
            row = existing
        else:
            row = PlausibilityAssessment(
                engagement_id=engagement.id,
                boundary_version_id=bv.id,
                verdict=assessment["verdict"],
                summary=assessment["summary"],
                signals=assessment["signals"],
                epistemic_label=assessment["epistemic_label"],
                assessed_at=datetime.now(UTC),
            )
            db.add(row)
        results.append(row)

    await db.flush()
    return results


async def complete_intake(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
) -> dict[str, Any]:
    detail = await engagement_detail(db, engagement, project)
    gate = detail["intake_gate"]
    if not gate["ready"]:
        raise ValueError("intake_gate_not_ready")

    engagement.status = "intake_complete"
    engagement.intake_completed_at = datetime.now(UTC)
    await db.flush()
    return await engagement_detail(db, engagement, project)


__all__ = [
    "ALLOWED_DOC_TYPES",
    "complete_intake",
    "create_boundary",
    "create_claim_document",
    "create_exclusion",
    "engagement_detail",
    "engagement_summary",
    "freeze_claim_snapshot",
    "get_engagement_by_project",
    "get_or_create_engagement",
    "import_kml",
    "run_gis_validation",
    "run_plausibility",
    "update_working_claim",
]
