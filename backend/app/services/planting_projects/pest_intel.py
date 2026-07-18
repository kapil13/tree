"""Pest & disease intelligence aggregated per work area (plantation)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.satellite_health_analysis import SatelliteHealthAnalysis
from app.models.tree import Tree
from app.services.bioacoustic.correlation import correlate_fence_ecosystem
from app.services.geo import geography_to_geojson_polygon, polygon_centroid
from app.services.weather.open_meteo import fetch_forecast


def _risk_from_signals(
    *,
    pest_needed: bool,
    disease_needed: bool,
    ndvi_trend: str | None,
    health_pct: float | None,
    rain_mm_48h: float | None,
) -> str:
    score = 0
    if pest_needed:
        score += 2
    if disease_needed:
        score += 2
    if ndvi_trend == "declining":
        score += 2
    elif ndvi_trend == "stable":
        score += 0
    if health_pct is not None and health_pct < 50:
        score += 2
    elif health_pct is not None and health_pct < 70:
        score += 1
    if rain_mm_48h and rain_mm_48h > 40:
        score += 1
    if score >= 5:
        return "critical"
    if score >= 3:
        return "high"
    if score >= 1:
        return "moderate"
    return "low"


async def build_pest_intel(
    db: AsyncSession,
    *,
    fence: PlantationFence,
    project: PlantingProject | None = None,
    weather_days: int = 5,
) -> dict[str, Any]:
    boundary = geography_to_geojson_polygon(fence.boundary)
    lat, lon = polygon_centroid(boundary)

    ecosystem = await correlate_fence_ecosystem(db, fence)
    bio = ecosystem.get("bioacoustic") or {}

    sat_res = await db.execute(
        select(SatelliteHealthAnalysis)
        .where(SatelliteHealthAnalysis.fence_id == fence.id)
        .order_by(SatelliteHealthAnalysis.created_at.desc())
        .limit(1)
    )
    sat = sat_res.scalar_one_or_none()

    weather = None
    rain_48h = 0.0
    try:
        weather = await fetch_forecast(lat, lon, days=weather_days)
        for day in (weather.days or [])[:2]:
            rain_48h += float(day.precipitation_mm or 0)
    except Exception:
        weather = None

    health_counts: dict[str, int] = {}
    total_trees = 0
    rows = await db.execute(
        select(Tree.current_health, func.count())
        .where(Tree.plantation_id == fence.id, Tree.status != "removed")
        .group_by(Tree.current_health)
    )
    for health, count in rows.all():
        health_counts[str(health)] = int(count)
        total_trees += int(count)

    healthy = health_counts.get("healthy", 0)
    health_pct = round(100.0 * healthy / total_trees, 1) if total_trees else None

    pest_needed = bool(sat.pest_control_needed) if sat else False
    disease_needed = bool(sat.disease_control_needed) if sat else False
    ndvi_trend = ecosystem.get("ndvi_trend") or (sat.ndvi_trend if sat else None)

    composite_risk = _risk_from_signals(
        pest_needed=pest_needed,
        disease_needed=disease_needed,
        ndvi_trend=ndvi_trend,
        health_pct=health_pct,
        rain_mm_48h=rain_48h,
    )

    actions: list[str] = []
    if pest_needed:
        actions.append("Schedule pest scouting in the plantation block.")
    if disease_needed:
        actions.append("Inspect for fungal or bacterial stress; improve drainage if heavy rain forecast.")
    if rain_48h > 30:
        actions.append(f"Heavy rain expected (~{rain_48h:.0f} mm / 48h) — check pit drainage and sapling guards.")
    if ndvi_trend == "declining":
        actions.append("NDVI trend declining — verify survival count and irrigation.")
    if health_pct is not None and health_pct < 70:
        actions.append(f"Ground health at {health_pct}% — plan survival survey / re-geotagging.")
    if not actions:
        actions.append("No urgent pest or disease signals. Continue routine monitoring.")

    return {
        "work_area_id": str(fence.id),
        "work_area_name": fence.name,
        "project_id": str(fence.project_id) if fence.project_id else None,
        "project_name": project.name if project else None,
        "generated_at": datetime.now(UTC).isoformat(),
        "composite_risk": composite_risk,
        "pest_control_needed": pest_needed,
        "disease_control_needed": disease_needed,
        "ndvi_mean": ecosystem.get("ndvi_mean"),
        "ndvi_trend": ndvi_trend,
        "ecosystem_score": ecosystem.get("ecosystem_score"),
        "interpretation": ecosystem.get("interpretation"),
        "tree_count": total_trees,
        "health_breakdown": health_counts,
        "healthy_pct": health_pct,
        "satellite_health": {
            "id": str(sat.id),
            "risk_level": sat.risk_level,
            "summary": sat.summary,
            "findings": sat.findings or [],
            "treatments": sat.treatments or [],
            "created_at": sat.created_at.isoformat() if sat else None,
        }
        if sat
        else None,
        "weather": weather.model_dump(mode="json") if weather else None,
        "rain_mm_next_48h": round(rain_48h, 1),
        "bioacoustic": {
            "recording_count": bio.get("recording_count", 0),
            "species_detected": bio.get("species_detected", 0),
            "avg_health_score": bio.get("avg_health_score"),
        },
        "recommended_actions": actions,
    }
