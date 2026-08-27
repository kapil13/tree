"""Build GHG / methane compliance export context for PDF reports."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emission_source import (
    DispersionSimulation,
    EmissionFusionAssessment,
    EmissionSatelliteScan,
)
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.emissions.dispersion.run import _simulation_to_out
from app.services.emissions.fusion import assessment_to_dict
from app.services.emissions.registry import emission_source_to_dict, list_emission_sources
from app.services.emissions.tropomi import scan_to_dict


async def build_emissions_compliance_context(
    db: AsyncSession,
    *,
    project: PlantingProject,
    work_area: PlantationFence,
) -> dict[str, Any]:
    """Aggregate registry, dispersion, TROPOMI, and fusion data for audit PDF."""
    sources = await list_emission_sources(
        db, project_id=project.id, work_area_id=work_area.id
    )
    source_rows = [emission_source_to_dict(s) for s in sources]
    active_count = sum(1 for s in sources if s.status == "active")
    total_rate_g_s = sum(
        float(s.emission_rate_g_s)
        for s in sources
        if s.status == "active" and s.emission_rate_g_s is not None
    )
    by_gas: dict[str, dict[str, int | float | None]] = {}
    for s in sources:
        bucket = by_gas.setdefault(
            s.gas_type,
            {"total": 0, "active": 0, "active_rate_g_s": 0.0},
        )
        bucket["total"] = int(bucket["total"]) + 1
        if s.status == "active":
            bucket["active"] = int(bucket["active"]) + 1
            if s.emission_rate_g_s is not None:
                bucket["active_rate_g_s"] = float(bucket["active_rate_g_s"]) + float(
                    s.emission_rate_g_s
                )

    dispersion_row = (
        await db.execute(
            select(DispersionSimulation)
            .where(
                DispersionSimulation.project_id == project.id,
                DispersionSimulation.work_area_id == work_area.id,
                DispersionSimulation.status == "complete",
            )
            .order_by(DispersionSimulation.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    scan_row = (
        await db.execute(
            select(EmissionSatelliteScan)
            .where(
                EmissionSatelliteScan.project_id == project.id,
                EmissionSatelliteScan.work_area_id == work_area.id,
                EmissionSatelliteScan.status == "complete",
            )
            .order_by(EmissionSatelliteScan.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    fusion_row = (
        await db.execute(
            select(EmissionFusionAssessment)
            .where(
                EmissionFusionAssessment.project_id == project.id,
                EmissionFusionAssessment.work_area_id == work_area.id,
                EmissionFusionAssessment.status == "complete",
            )
            .order_by(EmissionFusionAssessment.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    dispersion: dict[str, Any] | None = None
    if dispersion_row is not None:
        out = _simulation_to_out(dispersion_row, project.id)
        met = out.get("met_snapshot")
        dispersion = {
            "simulation_id": str(out["simulation_id"]),
            "created_at": dispersion_row.created_at.isoformat()
            if dispersion_row.created_at
            else None,
            "gas_type": out.get("gas_type"),
            "emission_rate_g_s": out.get("emission_rate_g_s"),
            "wind_speed_ms": out.get("wind_speed_ms"),
            "wind_direction_deg": out.get("wind_direction_deg"),
            "stability_class": out.get("stability_class"),
            "max_concentration_ug_m3": out.get("max_concentration_ug_m3"),
            "downwind_km": out.get("downwind_km"),
            "crosswind_km": out.get("crosswind_km"),
            "contour_count": len(out.get("contours") or []),
            "met_provider": dispersion_row.met_provider,
            "met_snapshot": met.model_dump() if hasattr(met, "model_dump") else met,
            "extends_outside_work_area": bool(
                (out.get("downwind_impact") or {}).get("features")
            ),
        }

    scan: dict[str, Any] | None = None
    if scan_row is not None:
        scan_data = scan_to_dict(scan_row)
        summary = scan_data.get("summary") or {}
        scan = {
            "scan_id": str(scan_data["id"]),
            "created_at": scan_data["created_at"].isoformat()
            if scan_data.get("created_at")
            else None,
            "provider": scan_data.get("provider"),
            "gas_type": scan_data.get("gas_type"),
            "buffer_km": scan_data.get("buffer_km"),
            "latest_mean_ppb": summary.get("latest_mean_ppb"),
            "baseline_ppb": summary.get("baseline_ppb"),
            "anomaly_ppb": summary.get("anomaly_ppb"),
            "months": summary.get("months"),
            "latest_time": summary.get("latest_time"),
        }

    fusion: dict[str, Any] | None = None
    if fusion_row is not None:
        fusion_data = assessment_to_dict(fusion_row)
        result = fusion_data.get("result") or {}
        fusion = {
            "assessment_id": str(fusion_data["id"]),
            "created_at": fusion_data["created_at"].isoformat()
            if fusion_data.get("created_at")
            else None,
            "alignment_score": fusion_data.get("alignment_score"),
            "verdict": fusion_data.get("verdict"),
            "summary": result.get("summary"),
            "anomaly_ppb": result.get("anomaly_ppb"),
            "wind_speed_ms": result.get("wind_speed_ms"),
            "wind_direction_deg": result.get("wind_direction_deg"),
            "plume_extends_outside": result.get("plume_extends_outside"),
            "pipeline": result.get("pipeline"),
            "findings": result.get("findings") or [],
            "sources": result.get("sources") or [],
        }

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "project": {
            "id": str(project.id),
            "code": project.code,
            "name": project.name,
            "segment": project.segment,
            "compliance_mode": project.compliance_mode,
        },
        "work_area": {
            "id": str(work_area.id),
            "name": work_area.name,
            "geometry_type": work_area.geometry_type,
            "area_ha": float(work_area.area_ha) if work_area.area_ha is not None else None,
            "segment_code": work_area.segment_code,
        },
        "summary": {
            "source_count": len(sources),
            "active_source_count": active_count,
            "total_active_rate_g_s": round(total_rate_g_s, 4) if total_rate_g_s else None,
            "has_dispersion": dispersion is not None,
            "has_satellite_scan": scan is not None,
            "has_fusion": fusion is not None,
            "fusion_verdict": fusion.get("verdict") if fusion else None,
            "fusion_alignment_score": fusion.get("alignment_score") if fusion else None,
            "by_gas": by_gas,
        },
        "sources": [
            {
                "name": s["name"],
                "source_type": s["source_type"],
                "gas_type": s["gas_type"],
                "status": s["status"],
                "emission_rate_g_s": s["emission_rate_g_s"],
                "annual_emission_tons": s["annual_emission_tons"],
                "release_height_m": s["release_height_m"],
            }
            for s in source_rows
        ],
        "dispersion": dispersion,
        "satellite_scan": scan,
        "fusion": fusion,
        "data_sources": [
            "Open-Meteo (wind / stability for Gaussian plume)",
            "Copernicus Sentinel-5P TROPOMI CH₄ via Sentinel Hub",
            "Aranyix BYOT emission fusion pipeline v1",
        ],
        "disclaimer": (
            "Operational monitoring report for declared GHG sources and satellite "
            "anomaly screening (CH₄ fusion where available). Not a regulatory "
            "compliance certificate, carbon credit issuance, or legal attestation "
            "of emissions."
        ),
    }
