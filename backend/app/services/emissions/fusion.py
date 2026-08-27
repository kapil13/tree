"""Wind-aligned CH₄ anomaly fusion — declared source vs TROPOMI + dispersion."""

from __future__ import annotations

import math
import uuid
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emission_source import (
    DispersionSimulation,
    EmissionFusionAssessment,
    EmissionSatelliteScan,
    EmissionSource,
)
from app.services.emissions.registry import effective_emission_rate_g_s
from app.services.geo import geography_to_geojson_geometry, point_lat_lon

PIPELINE = "byot-emission-fusion-1.0.0"
ANOMALY_THRESHOLD_PPB = 5.0
STRONG_ANOMALY_PPB = 15.0

Verdict = Literal["consistent", "uncertain", "misaligned", "no_signal"]


class FusionError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


@dataclass
class FusionFinding:
    category: str
    name: str
    severity: str
    message: str
    confidence: float = 0.7


@dataclass
class SourceFusionDetail:
    emission_source_id: uuid.UUID
    source_name: str
    gas_type: str
    emission_rate_g_s: float | None
    alignment_score: float
    verdict: Verdict
    wind_direction_deg: float
    downwind_bearing_deg: float | None
    bearing_delta_deg: float | None
    findings: list[FusionFinding] = field(default_factory=list)


@dataclass
class EmissionFusionResult:
    alignment_score: float
    verdict: Verdict
    summary: str
    anomaly_ppb: float | None
    baseline_ppb: float | None
    latest_mean_ppb: float | None
    wind_speed_ms: float
    wind_direction_deg: float
    plume_extends_outside: bool
    downwind_km: float
    scan_buffer_km: float
    sources: list[SourceFusionDetail]
    findings: list[FusionFinding] = field(default_factory=list)
    pipeline: str = PIPELINE
    raw_signals: dict[str, Any] = field(default_factory=dict)


def _bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return forward azimuth in degrees (0=north, 90=east)."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlam = math.radians(lon2 - lon1)
    y = math.sin(dlam) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlam)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def _angular_delta_deg(a: float, b: float) -> float:
    diff = abs(a - b) % 360.0
    return min(diff, 360.0 - diff)


def _wind_blow_to_deg(wind_from_deg: float) -> float:
    return (wind_from_deg + 180.0) % 360.0


def _downwind_axis_end(dispersion_result: dict[str, Any]) -> tuple[float, float] | None:
    fc = dispersion_result.get("downwind_impact") or {}
    for feature in fc.get("features") or []:
        props = feature.get("properties") or {}
        if props.get("kind") != "downwind_axis":
            continue
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coords) >= 2:
            end_lon, end_lat = coords[-1]
            return float(end_lat), float(end_lon)
    return None


def _source_point(source: EmissionSource) -> dict[str, Any]:
    geom = geography_to_geojson_geometry(source.location)
    if geom["type"] == "Point":
        return geom
    from app.services.geo import polygon_centroid

    lat, lon = polygon_centroid(geom)
    return {"type": "Point", "coordinates": [lon, lat]}


def _anomaly_score(anomaly_ppb: float | None) -> float:
    if anomaly_ppb is None or anomaly_ppb <= 0:
        return 0.0
    if anomaly_ppb >= STRONG_ANOMALY_PPB:
        return 40.0
    if anomaly_ppb >= ANOMALY_THRESHOLD_PPB:
        return 20.0 + (anomaly_ppb - ANOMALY_THRESHOLD_PPB) / (
            STRONG_ANOMALY_PPB - ANOMALY_THRESHOLD_PPB
        ) * 20.0
    return max(0.0, anomaly_ppb / ANOMALY_THRESHOLD_PPB * 20.0)


def _plume_score(dispersion_result: dict[str, Any]) -> float:
    score = 0.0
    if dispersion_result.get("extends_outside_work_area"):
        score += 20.0
    contours = dispersion_result.get("contours") or []
    if contours:
        score += 10.0
    if float(dispersion_result.get("downwind_km") or 0) >= 5.0:
        score += 5.0
    return min(30.0, score)


def _source_linkage_score(*, in_simulation: bool, has_rate: bool) -> float:
    score = 0.0
    if in_simulation:
        score += 20.0
    if has_rate:
        score += 10.0
    return score


def _verdict_from_score(score: float, anomaly_ppb: float | None) -> Verdict:
    if anomaly_ppb is None or anomaly_ppb <= 0:
        return "no_signal"
    if score >= 70.0:
        return "consistent"
    if score >= 40.0:
        return "uncertain"
    return "misaligned"


def assess_emission_fusion(
    *,
    sources: list[EmissionSource],
    dispersion_result: dict[str, Any],
    scan_summary: dict[str, Any],
    scan_buffer_km: float,
    simulation_source_ids: list[str],
) -> EmissionFusionResult:
    """Pure fusion scoring — no I/O."""
    anomaly_ppb = scan_summary.get("anomaly_ppb")
    if anomaly_ppb is not None:
        anomaly_ppb = float(anomaly_ppb)
    baseline_ppb = scan_summary.get("baseline_ppb")
    if baseline_ppb is not None:
        baseline_ppb = float(baseline_ppb)
    latest_mean = scan_summary.get("latest_mean_ppb")
    if latest_mean is not None:
        latest_mean = float(latest_mean)

    wind_from = float(dispersion_result.get("wind_direction_deg") or 0.0)
    wind_speed = float(dispersion_result.get("wind_speed_ms") or 0.0)
    wind_to = _wind_blow_to_deg(wind_from)
    plume_outside = bool(dispersion_result.get("extends_outside_work_area"))
    downwind_km = float(dispersion_result.get("downwind_km") or 0.0)
    axis_end = _downwind_axis_end(dispersion_result)

    anomaly_pts = _anomaly_score(anomaly_ppb)
    plume_pts = _plume_score(dispersion_result)

    findings: list[FusionFinding] = []
    source_details: list[SourceFusionDetail] = []

    if anomaly_ppb is None:
        findings.append(
            FusionFinding(
                category="satellite",
                name="no_anomaly_signal",
                severity="info",
                message="TROPOMI scan has no usable CH₄ anomaly (missing or non-finite values).",
                confidence=0.9,
            )
        )
    elif anomaly_ppb <= 0:
        findings.append(
            FusionFinding(
                category="satellite",
                name="negative_or_flat_anomaly",
                severity="info",
                message=f"ROI-mean CH₄ anomaly is {anomaly_ppb:+.1f} ppb — no elevated satellite signal.",
                confidence=0.85,
            )
        )
    else:
        findings.append(
            FusionFinding(
                category="satellite",
                name="positive_ch4_anomaly",
                severity="moderate" if anomaly_ppb < STRONG_ANOMALY_PPB else "high",
                message=(
                    f"TROPOMI ROI shows +{anomaly_ppb:.1f} ppb above baseline "
                    f"({latest_mean:.1f} vs {baseline_ppb:.1f} ppb)."
                    if latest_mean is not None and baseline_ppb is not None
                    else f"TROPOMI ROI shows +{anomaly_ppb:.1f} ppb above baseline."
                ),
                confidence=0.8,
            )
        )

    if plume_outside:
        findings.append(
            FusionFinding(
                category="dispersion",
                name="plume_extends_outside_work_area",
                severity="info",
                message=(
                    f"Modeled plume extends ~{downwind_km:.1f} km downwind outside the work area "
                    f"into the {scan_buffer_km:.0f} km satellite ROI."
                ),
                confidence=0.9,
            )
        )

    sim_id_set = {str(s) for s in simulation_source_ids}

    for source in sources:
        if source.status != "active" or source.gas_type != "CH4":
            continue
        point = _source_point(source)
        lat, lon = point_lat_lon(point)
        src_findings: list[FusionFinding] = []
        downwind_bearing = None
        bearing_delta = None
        linkage_pts = _source_linkage_score(
            in_simulation=str(source.id) in sim_id_set,
            has_rate=source.emission_rate_g_s is not None or source.annual_emission_tons is not None,
        )

        if axis_end is not None:
            end_lat, end_lon = axis_end
            downwind_bearing = _bearing_deg(lat, lon, end_lat, end_lon)
            bearing_delta = _angular_delta_deg(downwind_bearing, wind_to)
            if bearing_delta <= 25.0:
                src_findings.append(
                    FusionFinding(
                        category="wind",
                        name="downwind_axis_aligned",
                        severity="info",
                        message=(
                            f"Plume axis from {source.name} aligns with wind "
                            f"(Δ{bearing_delta:.0f}° to blow-to {wind_to:.0f}°)."
                        ),
                        confidence=0.85,
                    )
                )
            else:
                src_findings.append(
                    FusionFinding(
                        category="wind",
                        name="downwind_axis_misaligned",
                        severity="moderate",
                        message=(
                            f"Plume axis bearing {downwind_bearing:.0f}° differs from "
                            f"wind blow-to {wind_to:.0f}° by {bearing_delta:.0f}°."
                        ),
                        confidence=0.75,
                    )
                )

        src_score = anomaly_pts + plume_pts + linkage_pts
        if bearing_delta is not None and bearing_delta <= 25.0 and anomaly_ppb and anomaly_ppb > 0:
            src_score = min(100.0, src_score + 5.0)
        src_verdict = _verdict_from_score(src_score, anomaly_ppb)

        rate = None
        with suppress(Exception):
            rate = effective_emission_rate_g_s(source)

        source_details.append(
            SourceFusionDetail(
                emission_source_id=source.id,
                source_name=source.name,
                gas_type=source.gas_type,
                emission_rate_g_s=rate,
                alignment_score=round(src_score, 1),
                verdict=src_verdict,
                wind_direction_deg=round(wind_from, 1),
                downwind_bearing_deg=round(downwind_bearing, 1) if downwind_bearing is not None else None,
                bearing_delta_deg=round(bearing_delta, 1) if bearing_delta is not None else None,
                findings=src_findings,
            )
        )

    if source_details:
        alignment_score = round(
            max(s.alignment_score for s in source_details),
            1,
        )
        verdict = _verdict_from_score(alignment_score, anomaly_ppb)
    else:
        alignment_score = round(anomaly_pts + plume_pts, 1)
        verdict = _verdict_from_score(alignment_score, anomaly_ppb)

    if verdict == "consistent":
        summary = (
            f"Alignment {alignment_score}/100 — elevated TROPOMI CH₄ (+{anomaly_ppb:.1f} ppb) "
            f"is consistent with declared source(s) and downwind plume at {wind_speed:.1f} m/s "
            f"from {wind_from:.0f}°."
        )
    elif verdict == "uncertain":
        summary = (
            f"Alignment {alignment_score}/100 — some satellite/dispersion signals present but "
            "attribution to declared source(s) is inconclusive."
        )
    elif verdict == "no_signal":
        summary = "No positive TROPOMI CH₄ anomaly detected over the scan ROI."
    else:
        summary = (
            f"Alignment {alignment_score}/100 — satellite anomaly and modeled plume/source "
            "signals are weak or misaligned."
        )

    return EmissionFusionResult(
        alignment_score=alignment_score,
        verdict=verdict,
        summary=summary,
        anomaly_ppb=anomaly_ppb,
        baseline_ppb=baseline_ppb,
        latest_mean_ppb=latest_mean,
        wind_speed_ms=round(wind_speed, 2),
        wind_direction_deg=round(wind_from, 1),
        plume_extends_outside=plume_outside,
        downwind_km=downwind_km,
        scan_buffer_km=scan_buffer_km,
        sources=source_details,
        findings=findings,
        raw_signals={
            "anomaly_score_pts": anomaly_pts,
            "plume_score_pts": plume_pts,
            "wind_blow_to_deg": round(wind_to, 1),
            "anomaly_threshold_ppb": ANOMALY_THRESHOLD_PPB,
        },
    )


def fusion_result_to_dict(result: EmissionFusionResult) -> dict[str, Any]:
    return {
        "alignment_score": result.alignment_score,
        "verdict": result.verdict,
        "summary": result.summary,
        "anomaly_ppb": result.anomaly_ppb,
        "baseline_ppb": result.baseline_ppb,
        "latest_mean_ppb": result.latest_mean_ppb,
        "wind_speed_ms": result.wind_speed_ms,
        "wind_direction_deg": result.wind_direction_deg,
        "plume_extends_outside": result.plume_extends_outside,
        "downwind_km": result.downwind_km,
        "scan_buffer_km": result.scan_buffer_km,
        "sources": [
            {
                "emission_source_id": str(s.emission_source_id),
                "source_name": s.source_name,
                "gas_type": s.gas_type,
                "emission_rate_g_s": s.emission_rate_g_s,
                "alignment_score": s.alignment_score,
                "verdict": s.verdict,
                "wind_direction_deg": s.wind_direction_deg,
                "downwind_bearing_deg": s.downwind_bearing_deg,
                "bearing_delta_deg": s.bearing_delta_deg,
                "findings": [f.__dict__ for f in s.findings],
            }
            for s in result.sources
        ],
        "findings": [f.__dict__ for f in result.findings],
        "pipeline": result.pipeline,
        "raw_signals": result.raw_signals,
    }


async def get_latest_satellite_scan(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    work_area_id: uuid.UUID,
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


async def get_latest_fusion(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    work_area_id: uuid.UUID,
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


async def run_emission_fusion(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    work_area_id: uuid.UUID,
    user,
    dispersion: DispersionSimulation | None = None,
    scan: EmissionSatelliteScan | None = None,
    sources: list[EmissionSource] | None = None,
) -> tuple[EmissionFusionAssessment, EmissionFusionResult]:
    from app.services.emissions.dispersion.run import get_latest_dispersion
    from app.services.emissions.registry import list_emission_sources

    sim = dispersion or await get_latest_dispersion(
        db, project_id=project_id, work_area_id=work_area_id
    )
    if sim is None:
        raise FusionError("fusion_requires_dispersion")

    sat = scan or await get_latest_satellite_scan(db, project_id=project_id, work_area_id=work_area_id)
    if sat is None:
        raise FusionError("fusion_requires_scan")

    src_rows = sources
    if src_rows is None:
        src_rows = await list_emission_sources(db, project_id=project_id, work_area_id=work_area_id)

    result = assess_emission_fusion(
        sources=src_rows,
        dispersion_result=sim.result or {},
        scan_summary=sat.summary or {},
        scan_buffer_km=float(sat.buffer_km),
        simulation_source_ids=list(sim.emission_source_ids or []),
    )

    row = EmissionFusionAssessment(
        project_id=project_id,
        work_area_id=work_area_id,
        dispersion_simulation_id=sim.id,
        satellite_scan_id=sat.id,
        emission_source_ids=[str(s.id) for s in src_rows if s.status == "active"],
        alignment_score=result.alignment_score,
        verdict=result.verdict,
        result=fusion_result_to_dict(result),
        status="complete",
        created_by=user.id,
    )
    db.add(row)
    await db.flush()

    from app.models.plantation_fence import PlantationFence

    fence_res = await db.execute(
        select(PlantationFence).where(PlantationFence.id == work_area_id)
    )
    fence = fence_res.scalar_one_or_none()
    if fence is not None:
        from app.services.emissions.fusion_alerts import maybe_alert_emission_fusion

        await maybe_alert_emission_fusion(
            db,
            user=user,
            project_id=project_id,
            work_area_id=work_area_id,
            work_area_name=fence.name,
            result=result,
        )

    return row, result


def assessment_to_dict(row: EmissionFusionAssessment) -> dict[str, Any]:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "work_area_id": row.work_area_id,
        "dispersion_simulation_id": row.dispersion_simulation_id,
        "satellite_scan_id": row.satellite_scan_id,
        "emission_source_ids": row.emission_source_ids,
        "alignment_score": float(row.alignment_score),
        "verdict": row.verdict,
        "result": row.result,
        "status": row.status,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
