"""Demo GHG workspace fixtures for DEMO-GHG-MINING."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emission_source import (
    DispersionSimulation,
    EmissionFusionAssessment,
    EmissionSatelliteScan,
    EmissionSource,
)
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.emissions.fusion import assess_emission_fusion, fusion_result_to_dict
from app.services.planting_projects.service import create_standard_from_template
from app.services.planting_projects.templates import template_for_segment
from app.services.schemes.compliance import seed_project_scheme_checklists
from app.services.schemes.registry import get_scheme
from app.services.schemes.resolution import apply_scheme_defaults

DEMO_GHG_PROJECT_CODE = "DEMO-GHG-MINING"


def _demo_dispersion_result(*, wind_from: float = 270.0, extends_outside: bool = True) -> dict[str, Any]:
    return {
        "gas_type": "CH4",
        "wind_speed_ms": 3.5,
        "wind_direction_deg": wind_from,
        "extends_outside_work_area": extends_outside,
        "downwind_km": 10.0,
        "max_concentration_ug_m3": 142.5,
        "stability_class": "D",
        "contours": [],
        "downwind_impact": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"kind": "downwind_axis"},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[77.12, 23.12], [77.28, 23.12]],
                    },
                }
            ],
        },
        "inside_boundary": {"type": "FeatureCollection", "features": []},
    }


def _demo_scan_series(months: int = 12, latest_anomaly: float = 18.0) -> tuple[list[dict], dict]:
    base = 1855.0
    series: list[dict] = []
    now = datetime.now(UTC).replace(day=1)
    for i in range(months):
        t = now - timedelta(days=30 * (months - 1 - i))
        mean = base + (latest_anomaly if i == months - 1 else 2.0)
        series.append({"time": t.isoformat(), "mean_ppb": round(mean, 2)})
    summary = {
        "latest_time": series[-1]["time"],
        "latest_mean_ppb": series[-1]["mean_ppb"],
        "baseline_ppb": round(base, 2),
        "anomaly_ppb": latest_anomaly,
        "months": months,
        "demo_stub": True,
    }
    return series, summary


def _demo_roi_polygon(lng: float, lat: float, delta: float = 0.02) -> dict:
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [lng - delta, lat - delta],
                [lng + delta, lat - delta],
                [lng + delta, lat + delta],
                [lng - delta, lat + delta],
                [lng - delta, lat - delta],
            ]
        ],
    }


async def _ensure_work_area(
    db: AsyncSession,
    *,
    project: PlantingProject,
    name: str,
    wkt: str,
    owner_user_id: uuid.UUID,
) -> PlantationFence:
    existing = (
        await db.execute(
            select(PlantationFence).where(
                PlantationFence.project_id == project.id,
                PlantationFence.name == name,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    fence = PlantationFence(
        name=name,
        project_id=project.id,
        geometry_type="polygon",
        owner_user_id=owner_user_id,
        organization_id=project.organization_id,
        boundary=WKTElement(wkt, srid=4326),
        metadata_={"demo": True, "ghg_workspace": True},
    )
    db.add(fence)
    await db.flush()
    area_res = await db.execute(select(func.ST_Area(func.ST_GeogFromText(wkt)) / 10000.0))
    fence.area_ha = round(float(area_res.scalar_one()), 4)
    return fence


async def _seed_site(
    db: AsyncSession,
    *,
    project: PlantingProject,
    fence: PlantationFence,
    owner_user_id: uuid.UUID,
    source_specs: list[dict],
    anomaly_ppb: float,
    wind_from: float,
) -> dict[str, int]:
    created = {"sources": 0, "dispersion": 0, "scan": 0, "fusion": 0}

    source_rows: list[EmissionSource] = []
    for spec in source_specs:
        pt = spec["point"]
        wkt = f"POINT({pt[0]} {pt[1]})"
        existing = (
            await db.execute(
                select(EmissionSource).where(
                    EmissionSource.work_area_id == fence.id,
                    EmissionSource.name == spec["name"],
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            source_rows.append(existing)
            continue
        row = EmissionSource(
            project_id=project.id,
            work_area_id=fence.id,
            name=spec["name"],
            source_type=spec.get("source_type", "landfill"),
            gas_type="CH4",
            geometry_kind="point",
            location=WKTElement(wkt, srid=4326),
            emission_rate_g_s=spec.get("rate_g_s", 8.0),
            release_height_m=2.0,
            status="active",
            owner_user_id=owner_user_id,
            organization_id=project.organization_id,
            metadata_={"demo": True},
        )
        db.add(row)
        await db.flush()
        source_rows.append(row)
        created["sources"] += 1

    source_ids = [str(s.id) for s in source_rows]
    disp = (
        await db.execute(
            select(DispersionSimulation)
            .where(DispersionSimulation.work_area_id == fence.id)
            .limit(1)
        )
    ).scalar_one_or_none()
    if disp is None:
        disp = DispersionSimulation(
            project_id=project.id,
            work_area_id=fence.id,
            emission_source_ids=source_ids,
            duration_hours=24,
            met_provider="demo",
            met_snapshot={"demo": True},
            result=_demo_dispersion_result(wind_from=wind_from),
            status="complete",
            created_by=owner_user_id,
        )
        db.add(disp)
        await db.flush()
        created["dispersion"] += 1

    scan = (
        await db.execute(
            select(EmissionSatelliteScan)
            .where(EmissionSatelliteScan.work_area_id == fence.id)
            .limit(1)
        )
    ).scalar_one_or_none()
    if scan is None:
        series, summary = _demo_scan_series(latest_anomaly=anomaly_ppb)
        lng, lat = source_specs[0]["point"]
        scan = EmissionSatelliteScan(
            project_id=project.id,
            work_area_id=fence.id,
            gas_type="CH4",
            provider="demo-stub-tropomi",
            buffer_km=25.0,
            roi_geojson=_demo_roi_polygon(lng, lat),
            series=series,
            summary=summary,
            status="complete",
            created_by=owner_user_id,
        )
        db.add(scan)
        await db.flush()
        created["scan"] += 1

    fusion = (
        await db.execute(
            select(EmissionFusionAssessment)
            .where(EmissionFusionAssessment.work_area_id == fence.id)
            .limit(1)
        )
    ).scalar_one_or_none()
    if fusion is None:
        result = assess_emission_fusion(
            sources=source_rows,
            dispersion_result=disp.result or {},
            scan_summary=scan.summary or {},
            scan_buffer_km=float(scan.buffer_km),
            simulation_source_ids=source_ids,
        )
        fusion = EmissionFusionAssessment(
            project_id=project.id,
            work_area_id=fence.id,
            dispersion_simulation_id=disp.id,
            satellite_scan_id=scan.id,
            emission_source_ids=source_ids,
            alignment_score=result.alignment_score,
            verdict=result.verdict,
            result=fusion_result_to_dict(result),
            status="complete",
            created_by=owner_user_id,
        )
        db.add(fusion)
        await db.flush()
        created["fusion"] += 1

    return created


async def ensure_demo_ghg_workspace(
    db: AsyncSession,
    *,
    org,
    manager,
) -> dict[str, Any]:
    """Idempotent DEMO-GHG-MINING project with two contrasting fusion sites."""
    project = (
        await db.execute(
            select(PlantingProject).where(
                PlantingProject.organization_id == org.id,
                PlantingProject.code == DEMO_GHG_PROJECT_CODE,
            )
        )
    ).scalar_one_or_none()

    if project is None:
        scheme = get_scheme("mining_reclamation")
        if scheme is None:
            return {"skipped": True, "reason": "mining_reclamation_scheme_missing"}

        segment, compliance, template_code = apply_scheme_defaults(
            scheme=scheme,
            segment="mining",
            compliance_mode="strict",
            program_code="government_nhai",
            standard_template_code=None,
        )
        if not template_code:
            template_code = template_for_segment(segment)["code"]

        project = PlantingProject(
            code=DEMO_GHG_PROJECT_CODE,
            name="Demo — GHG Mining Reclamation (CH₄)",
            description="Showcase methane registry, TROPOMI screening, and fusion for mining reclamation.",
            segment=segment,
            compliance_mode=compliance,
            status="active",
            program_code="government_nhai",
            scheme_code="mining_reclamation",
            standard_template_code=template_code,
            target_tree_count=5000,
            organization_id=org.id,
            owner_user_id=manager.id,
            metadata_={
                "demo": True,
                "ghg_showcase": True,
                "scheme_refs": {
                    "mine_lease_id": "ML-DEMO-GHG-2026",
                    "pmcp_reference": "PMCP/DEMO/GHG",
                },
            },
        )
        db.add(project)
        await db.flush()
        await create_standard_from_template(db, project=project, template_code=template_code)
        await seed_project_scheme_checklists(db, project)
        project_created = True
    else:
        project_created = False

    fence_mis = await _ensure_work_area(
        db,
        project=project,
        name="Overburden flare zone",
        wkt="POLYGON((77.10 23.10, 77.16 23.10, 77.16 23.16, 77.10 23.16, 77.10 23.10))",
        owner_user_id=manager.id,
    )
    fence_ok = await _ensure_work_area(
        db,
        project=project,
        name="Reclamation biogas capture",
        wkt="POLYGON((77.18 23.08, 77.24 23.08, 77.24 23.14, 77.18 23.14, 77.18 23.08))",
        owner_user_id=manager.id,
    )

    site_a = await _seed_site(
        db,
        project=project,
        fence=fence_mis,
        owner_user_id=manager.id,
        source_specs=[
            {"name": "Flare stack A", "source_type": "flare", "point": [77.13, 23.13], "rate_g_s": 22.0},
            {"name": "Overburden vent", "source_type": "mine", "point": [77.12, 23.12], "rate_g_s": 6.0},
        ],
        anomaly_ppb=22.0,
        wind_from=90.0,
    )
    site_b = await _seed_site(
        db,
        project=project,
        fence=fence_ok,
        owner_user_id=manager.id,
        source_specs=[
            {
                "name": "Biogas capture unit",
                "source_type": "compost",
                "point": [77.21, 23.11],
                "rate_g_s": 4.5,
            },
        ],
        anomaly_ppb=8.0,
        wind_from=270.0,
    )

    return {
        "project_id": str(project.id),
        "project_code": project.code,
        "project_created": project_created,
        "sites": {"misaligned_zone": site_a, "consistent_zone": site_b},
    }
