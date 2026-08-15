"""TNFD nature disclosure reports (LEAP: Locate, Evaluate, Assess, Prepare)."""

from __future__ import annotations

import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from geoalchemy2.shape import to_shape
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.organization import Organization
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject
from app.models.work_area_biodiversity_snapshot import WorkAreaBiodiversitySnapshot
from app.services.planting_projects.mrv_export import build_project_mrv_context

TNFD_VERSION = "v1.0 (LEAP-aligned)"
STANDARD = "TNFD"


async def _fence_ndvi_summary(db: AsyncSession, fence_id: Any) -> dict[str, Any]:
    rec = (
        await db.execute(
            select(PlantationSatelliteRecord)
            .where(PlantationSatelliteRecord.fence_id == fence_id)
            .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if rec is None:
        return {"ndvi_mean": None, "scene_acquired_at": None, "provider": None}
    return {
        "ndvi_mean": float(rec.ndvi_mean) if rec.ndvi_mean is not None else None,
        "ndvi_max": float(rec.ndvi_max) if rec.ndvi_max is not None else None,
        "scene_acquired_at": rec.scene_acquired_at.isoformat() if rec.scene_acquired_at else None,
        "provider": rec.provider,
    }


async def _fence_bioacoustic_summary(db: AsyncSession, fence_id: Any) -> dict[str, Any]:
    recs = list(
        (
            await db.execute(
                select(BioacousticRecording)
                .where(
                    BioacousticRecording.plantation_fence_id == fence_id,
                    BioacousticRecording.status == "analyzed",
                )
                .order_by(BioacousticRecording.recorded_at.desc())
                .limit(5)
            )
        ).scalars().all()
    )
    if not recs:
        return {"recording_count": 0, "species_richness": 0, "threatened_count": 0}

    species: set[str] = set()
    threatened = 0
    shannon_vals: list[float] = []
    for rec in recs:
        if rec.shannon_diversity_index is not None:
            shannon_vals.append(float(rec.shannon_diversity_index))
        for det in rec.species_detections or []:
            name = det.get("scientific_name") or det.get("species")
            if name:
                species.add(name)
            iucn = (det.get("iucn") or {}).get("category") or det.get("iucn_category")
            if iucn in {"CR", "EN", "VU", "NT"}:
                threatened += 1

    return {
        "recording_count": len(recs),
        "species_richness": len(species),
        "threatened_signals": threatened,
        "avg_shannon_diversity": round(sum(shannon_vals) / len(shannon_vals), 3) if shannon_vals else None,
        "top_species": sorted(species)[:10],
    }


async def _fence_iucn_snapshot(db: AsyncSession, fence_id: Any) -> dict[str, Any]:
    snap = (
        await db.execute(
            select(WorkAreaBiodiversitySnapshot)
            .where(WorkAreaBiodiversitySnapshot.fence_id == fence_id)
            .order_by(WorkAreaBiodiversitySnapshot.captured_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if snap is None:
        return {"species_count": 0, "species": []}
    species_list = snap.species or []
    threatened = sum(
        1
        for s in species_list
        if (s.get("iucn_category") or s.get("iucn_status")) in {"CR", "EN", "VU", "NT"}
    )
    return {
        "species_count": snap.species_count,
        "threatened_count": threatened,
        "captured_at": snap.captured_at.isoformat(),
        "species": species_list[:20],
    }


async def build_tnfd_context(
    db: AsyncSession,
    *,
    organization: Organization,
    project_id: Any | None = None,
) -> dict[str, Any]:
    stmt = select(PlantingProject).where(PlantingProject.organization_id == organization.id)
    if project_id is not None:
        stmt = stmt.where(PlantingProject.id == project_id)
    projects = list((await db.execute(stmt.order_by(PlantingProject.code.asc()))).scalars().all())

    locate_sites: list[dict[str, Any]] = []
    evaluate_metrics: list[dict[str, Any]] = []
    assess_risks: list[dict[str, Any]] = []
    prepare_disclosures: list[dict[str, Any]] = []

    total_ndvi: list[float] = []
    total_threatened = 0
    total_species = 0

    for project in projects:
        mrv = await build_project_mrv_context(db, project)
        fences_res = await db.execute(
            select(PlantationFence).where(PlantationFence.project_id == project.id)
        )
        fences = list(fences_res.scalars().all())

        for fence in fences:
            ndvi = await _fence_ndvi_summary(db, fence.id)
            bio = await _fence_bioacoustic_summary(db, fence.id)
            iucn = await _fence_iucn_snapshot(db, fence.id)

            if ndvi.get("ndvi_mean") is not None:
                total_ndvi.append(ndvi["ndvi_mean"])
            total_threatened += iucn.get("threatened_count", 0) + bio.get("threatened_signals", 0)
            total_species += max(bio.get("species_richness", 0), iucn.get("species_count", 0))

            centroid = None
            try:
                if fence.boundary is not None:
                    shape = to_shape(fence.boundary)
                    centroid = {"lat": shape.centroid.y, "lon": shape.centroid.x}
            except Exception:
                centroid = None

            locate_sites.append(
                {
                    "project_code": project.code,
                    "work_area": fence.name,
                    "area_ha": float(fence.area_ha) if fence.area_ha else None,
                    "centroid": centroid,
                    "segment": project.segment,
                }
            )
            evaluate_metrics.append(
                {
                    "project_code": project.code,
                    "work_area": fence.name,
                    "ndvi": ndvi,
                    "bioacoustic": bio,
                    "iucn_checklist": iucn,
                }
            )
            assess_risks.append(
                {
                    "project_code": project.code,
                    "work_area": fence.name,
                    "open_violations": mrv.get("summary", {}).get("open_violations", 0),
                    "native_species_pct": mrv.get("summary", {}).get("native_species_pct"),
                    "threatened_species_signals": iucn.get("threatened_count", 0)
                    + bio.get("threatened_signals", 0),
                    "canopy_stress": (
                        "elevated"
                        if ndvi.get("ndvi_mean") is not None and ndvi["ndvi_mean"] < 0.35
                        else "stable"
                    ),
                }
            )

        prepare_disclosures.append(
            {
                "project_code": project.code,
                "project_name": project.name,
                "tree_count": mrv.get("summary", {}).get("tree_count", 0),
                "scheme": mrv.get("scheme", {}).get("code"),
                "recommended_metrics": [
                    "Species richness (bioacoustic + IUCN checklist)",
                    "Mean NDVI canopy greenness",
                    "Threatened taxa signal count",
                    "Compliance violation status",
                ],
            }
        )

    avg_ndvi = round(sum(total_ndvi) / len(total_ndvi), 4) if total_ndvi else None

    return {
        "standard": STANDARD,
        "tnfd_version": TNFD_VERSION,
        "framework": "LEAP (Locate, Evaluate, Assess, Prepare)",
        "generated_at": datetime.now(UTC).isoformat(),
        "organization": {
            "id": str(organization.id),
            "name": organization.name,
            "slug": organization.slug,
        },
        "scope": "single_project" if project_id else "organization_portfolio",
        "leap": {
            "locate": {
                "description": "Interface with nature — geospatial sites and work areas",
                "sites": locate_sites,
                "site_count": len(locate_sites),
            },
            "evaluate": {
                "description": "Dependencies and impacts — NDVI, soundscape, regional species",
                "site_metrics": evaluate_metrics,
                "portfolio_avg_ndvi": avg_ndvi,
            },
            "assess": {
                "description": "Material nature-related risks and opportunities",
                "site_assessments": assess_risks,
                "portfolio_threatened_signals": total_threatened,
            },
            "prepare": {
                "description": "Disclosure metrics and stakeholder reporting",
                "project_disclosures": prepare_disclosures,
                "portfolio_species_richness_estimate": total_species,
            },
        },
        "disclaimer": (
            "TNFD-aligned nature disclosure generated from BYOT MRV, bioacoustic, IUCN, and NDVI data. "
            "Not a substitute for third-party TNFD assurance."
        ),
    }


def render_tnfd_json(ctx: dict[str, Any]) -> bytes:
    return json.dumps(ctx, indent=2, default=str).encode("utf-8")


def render_tnfd_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "TNFD LEAP"
    ws.append(["Phase", "Project", "Work area", "Metric", "Value"])
    for site in ctx.get("leap", {}).get("locate", {}).get("sites", []):
        ws.append(["Locate", site.get("project_code"), site.get("work_area"), "area_ha", site.get("area_ha")])
    for row in ctx.get("leap", {}).get("evaluate", {}).get("site_metrics", []):
        ndvi = row.get("ndvi") or {}
        ws.append(
            [
                "Evaluate",
                row.get("project_code"),
                row.get("work_area"),
                "ndvi_mean",
                ndvi.get("ndvi_mean"),
            ]
        )
    for row in ctx.get("leap", {}).get("assess", {}).get("site_assessments", []):
        ws.append(
            [
                "Assess",
                row.get("project_code"),
                row.get("work_area"),
                "threatened_signals",
                row.get("threatened_species_signals"),
            ]
        )
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_tnfd_zip(ctx: dict[str, Any]) -> bytes:
    slug = (ctx.get("organization", {}).get("slug") or "org").replace("/", "-")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"tnfd-leap-{slug}.json", render_tnfd_json(ctx))
        zf.writestr(f"tnfd-leap-{slug}.xlsx", render_tnfd_xlsx(ctx))
    return buf.getvalue()
