"""Portfolio threat watch — weather, pest/disease, and early warnings per work area."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.geo import geography_to_geojson_polygon, polygon_centroid
from app.services.planting_projects.pest_intel import build_pest_intel
from app.services.threats.locust import locust_early_warning
from app.services.weather.alerts import evaluate_weather_alerts, weather_alert_summary

RISK_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}


def _fence_scope(stmt, user: User):
    if user.role == "admin":
        return stmt
    if user.organization_id:
        return stmt.where(
            (PlantationFence.owner_user_id == user.id)
            | (PlantationFence.organization_id == user.organization_id)
        )
    return stmt.where(PlantationFence.owner_user_id == user.id)


def _early_warnings_from_intel(
    *,
    pest_needed: bool,
    disease_needed: bool,
    ndvi_trend: str | None,
    rain_mm_48h: float,
    composite_risk: str,
    latitude: float,
    longitude: float,
) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []

    locust = locust_early_warning(latitude, longitude)
    if locust:
        warnings.append(locust)

    if pest_needed and rain_mm_48h >= 25:
        warnings.append(
            {
                "kind": "pest_outbreak",
                "severity": "warning" if composite_risk in ("high", "critical") else "info",
                "title": "Pest outbreak risk after rain",
                "message": (
                    "Satellite signals pest pressure and heavy rain is forecast. "
                    "Scout for defoliators, borers, and scale insects within 72 hours."
                ),
                "source": "composite",
            }
        )
    elif pest_needed:
        warnings.append(
            {
                "kind": "pest_outbreak",
                "severity": "warning" if composite_risk == "critical" else "info",
                "title": "Pest pressure detected",
                "message": (
                    "NDVI analysis flags possible pest damage. "
                    "Conduct ground scouting along plantation rows."
                ),
                "source": "satellite",
            }
        )

    if disease_needed and rain_mm_48h >= 20:
        warnings.append(
            {
                "kind": "fungal_disease",
                "severity": "warning",
                "title": "Fungal disease risk elevated",
                "message": (
                    "Disease signal plus wet weather increases fungal risk. "
                    "Improve airflow, avoid overhead irrigation, and inspect leaf spots."
                ),
                "source": "composite",
            }
        )
    elif disease_needed:
        warnings.append(
            {
                "kind": "fungal_disease",
                "severity": "info",
                "title": "Disease stress signal",
                "message": "Satellite health suggests possible disease — verify on ground.",
                "source": "satellite",
            }
        )

    if ndvi_trend == "declining" and composite_risk in ("high", "critical"):
        warnings.append(
            {
                "kind": "canopy_decline",
                "severity": "warning",
                "title": "Canopy decline — investigate cause",
                "message": (
                    "NDVI trend is declining with elevated composite risk. "
                    "Rule out pest, disease, drought, or mortality before next satellite pass."
                ),
                "source": "satellite",
            }
        )

    if rain_mm_48h >= 50 and not disease_needed:
        warnings.append(
            {
                "kind": "post_rain_scout",
                "severity": "info",
                "title": "Post-rain scouting recommended",
                "message": (
                    f"~{rain_mm_48h:.0f} mm rain expected in 48h. "
                    "Wet spells often trigger secondary pest and fungal attacks."
                ),
                "source": "weather",
            }
        )

    return warnings


async def build_site_threat_watch(
    db: AsyncSession,
    *,
    fence: PlantationFence,
    project: PlantingProject | None = None,
    weather_days: int = 5,
) -> dict[str, Any]:
    """Threat watch for a single work area."""
    boundary = geography_to_geojson_polygon(fence.boundary)
    lat, lon = polygon_centroid(boundary)

    intel = await build_pest_intel(db, fence=fence, project=project, weather_days=weather_days)

    weather_alerts: list[dict[str, Any]] = []
    forecast_summary = "Forecast unavailable."
    if intel.get("weather"):
        from app.schemas.weather import WeatherForecast

        forecast = WeatherForecast.model_validate(intel["weather"])
        weather_alerts = evaluate_weather_alerts(forecast, days=weather_days)
        forecast_summary = weather_alert_summary(weather_alerts)
        if not weather_alerts and forecast.days:
            d0 = forecast.days[0]
            forecast_summary = (
                f"Next: {d0.description}, {d0.temp_min_c:.0f}–{d0.temp_max_c:.0f}°C, "
                f"{d0.precipitation_mm:.0f} mm rain."
            )

    early_warnings = _early_warnings_from_intel(
        pest_needed=bool(intel.get("pest_control_needed")),
        disease_needed=bool(intel.get("disease_control_needed")),
        ndvi_trend=intel.get("ndvi_trend"),
        rain_mm_48h=float(intel.get("rain_mm_next_48h") or 0),
        composite_risk=str(intel.get("composite_risk") or "low"),
        latitude=lat,
        longitude=lon,
    )

    return {
        "work_area_id": str(fence.id),
        "work_area_name": fence.name,
        "project_id": str(fence.project_id) if fence.project_id else None,
        "project_name": project.name if project else intel.get("project_name"),
        "latitude": round(lat, 5),
        "longitude": round(lon, 5),
        "composite_risk": intel.get("composite_risk", "low"),
        "pest_control_needed": intel.get("pest_control_needed", False),
        "disease_control_needed": intel.get("disease_control_needed", False),
        "rain_mm_next_48h": intel.get("rain_mm_next_48h", 0),
        "ndvi_trend": intel.get("ndvi_trend"),
        "healthy_pct": intel.get("healthy_pct"),
        "tree_count": intel.get("tree_count", 0),
        "weather_alerts": weather_alerts,
        "early_warnings": early_warnings,
        "forecast_summary": forecast_summary,
        "recommended_actions": intel.get("recommended_actions", []),
    }


async def build_portfolio_threat_watch(
    db: AsyncSession,
    *,
    user: User,
    limit: int = 12,
) -> dict[str, Any]:
    """Aggregate threat watch across all accessible plantation work areas."""
    stmt = _fence_scope(select(PlantationFence), user).order_by(PlantationFence.created_at.desc())
    fences = list((await db.execute(stmt.limit(limit))).scalars().all())

    project_cache: dict[uuid.UUID, PlantingProject] = {}
    sites: list[dict[str, Any]] = []

    for fence in fences:
        project = None
        if fence.project_id:
            if fence.project_id not in project_cache:
                res = await db.execute(
                    select(PlantingProject).where(PlantingProject.id == fence.project_id)
                )
                project_cache[fence.project_id] = res.scalar_one_or_none()
            project = project_cache.get(fence.project_id)

        try:
            site = await build_site_threat_watch(db, fence=fence, project=project)
            sites.append(site)
        except Exception:
            continue

    sites.sort(
        key=lambda s: (
            RISK_ORDER.get(s.get("composite_risk", "low"), 0),
            len([a for a in s.get("weather_alerts", []) if a.get("severity") in ("warning", "critical")]),
            len(s.get("early_warnings", [])),
        ),
        reverse=True,
    )

    weather_count = sum(
        1
        for s in sites
        for a in s.get("weather_alerts", [])
        if a.get("severity") in ("warning", "critical")
    )
    pest_high = sum(1 for s in sites if s.get("composite_risk") in ("high", "critical"))
    locust_watch = sum(
        1 for s in sites for w in s.get("early_warnings", []) if w.get("kind") == "locust"
    )

    highest = "low"
    for s in sites:
        r = s.get("composite_risk", "low")
        if RISK_ORDER.get(r, 0) > RISK_ORDER.get(highest, 0):
            highest = r

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "sites_monitored": len(sites),
            "weather_alerts_count": weather_count,
            "pest_high_count": pest_high,
            "locust_watch_count": locust_watch,
            "highest_risk": highest,
        },
        "sites": sites,
    }
