"""Organization-level GHG / CH₄ emissions rollup for dashboards."""

from __future__ import annotations

from typing import Any

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
from app.services.emissions.tropomi import tropomi_configured
from app.services.planting_projects.access import project_list_filter


async def _latest_fusion_for_area(
    db: AsyncSession, project_id, work_area_id
) -> EmissionFusionAssessment | None:
    res = await db.execute(
        select(EmissionFusionAssessment)
        .where(
            EmissionFusionAssessment.project_id == project_id,
            EmissionFusionAssessment.work_area_id == work_area_id,
            EmissionFusionAssessment.status == "complete",
        )
        .order_by(EmissionFusionAssessment.created_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()


async def _latest_scan_for_area(
    db: AsyncSession, project_id, work_area_id
) -> EmissionSatelliteScan | None:
    res = await db.execute(
        select(EmissionSatelliteScan)
        .where(
            EmissionSatelliteScan.project_id == project_id,
            EmissionSatelliteScan.work_area_id == work_area_id,
            EmissionSatelliteScan.status == "complete",
        )
        .order_by(EmissionSatelliteScan.created_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()


async def build_emissions_portfolio_summary(db: AsyncSession, user) -> dict[str, Any]:
    stmt = select(PlantingProject).order_by(PlantingProject.created_at.desc())
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())

    site_rows: list[dict[str, Any]] = []
    misaligned_count = 0
    monitored_sites = 0
    strong_anomaly_sites = 0
    ch4_source_count = 0

    for project in projects:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id == project.id)
                )
            )
            .scalars()
            .all()
        )
        for fence in fences:
            src_count_res = await db.execute(
                select(func.count())
                .select_from(EmissionSource)
                .where(
                    EmissionSource.work_area_id == fence.id,
                    EmissionSource.status == "active",
                )
            )
            active_sources = int(src_count_res.scalar_one() or 0)
            ch4_res = await db.execute(
                select(func.count())
                .select_from(EmissionSource)
                .where(
                    EmissionSource.work_area_id == fence.id,
                    EmissionSource.status == "active",
                    EmissionSource.gas_type == "CH4",
                )
            )
            ch4_sources = int(ch4_res.scalar_one() or 0)
            ch4_source_count += ch4_sources

            fusion = await _latest_fusion_for_area(db, project.id, fence.id)
            scan = await _latest_scan_for_area(db, project.id, fence.id)

            anomaly_ppb = None
            if scan and scan.summary:
                anomaly_ppb = scan.summary.get("anomaly_ppb")

            verdict = fusion.verdict if fusion else None
            if active_sources > 0 or fusion or scan:
                monitored_sites += 1
            if verdict == "misaligned":
                misaligned_count += 1
            if anomaly_ppb is not None and float(anomaly_ppb) >= 15.0:
                strong_anomaly_sites += 1

            disp_res = await db.execute(
                select(DispersionSimulation)
                .where(
                    DispersionSimulation.project_id == project.id,
                    DispersionSimulation.work_area_id == fence.id,
                    DispersionSimulation.status == "complete",
                )
                .order_by(DispersionSimulation.created_at.desc())
                .limit(1)
            )
            dispersion = disp_res.scalar_one_or_none()

            site_rows.append(
                {
                    "project_id": str(project.id),
                    "project_code": project.code,
                    "project_name": project.name,
                    "scheme_code": project.scheme_code,
                    "work_area_id": str(fence.id),
                    "work_area_name": fence.name,
                    "active_source_count": active_sources,
                    "ch4_source_count": ch4_sources,
                    "has_dispersion": dispersion is not None,
                    "has_tropomi_scan": scan is not None,
                    "anomaly_ppb": anomaly_ppb,
                    "alignment_score": float(fusion.alignment_score) if fusion else None,
                    "verdict": verdict,
                    "fusion_at": fusion.created_at.isoformat() if fusion else None,
                    "scan_at": scan.created_at.isoformat() if scan else None,
                }
            )

    site_rows.sort(
        key=lambda r: (
            0
            if r["verdict"] == "misaligned"
            else 1
            if r["verdict"] == "uncertain"
            else 2,
            -(r["anomaly_ppb"] or 0),
        )
    )

    return {
        "tropomi_configured": tropomi_configured(),
        "kpis": {
            "monitored_sites": monitored_sites,
            "misaligned_sites": misaligned_count,
            "strong_anomaly_sites": strong_anomaly_sites,
            "ch4_active_sources": ch4_source_count,
        },
        "sites": site_rows,
    }
