"""Portfolio intelligence summary — fuses weather, pest, threat, and biodiversity signals."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.work_area_biodiversity_snapshot import WorkAreaBiodiversitySnapshot
from app.services.intelligence.integrations import build_integrations_health
from app.services.intelligence.satellite_fusion import build_portfolio_satellite_fusion
from app.services.planting_projects.access import project_list_filter
from app.services.planting_projects.field_ops import build_field_ops_summary
from app.services.threats.watch import build_portfolio_threat_watch


async def build_intelligence_summary(
    db: AsyncSession,
    user,
    *,
    site_limit: int = 15,
) -> dict[str, Any]:
    field_ops = await build_field_ops_summary(db, user)
    threat = await build_portfolio_threat_watch(db, user=user, limit=site_limit)
    integrations = await build_integrations_health()

    pest_hotspots = [
        {
            "work_area_id": s["work_area_id"],
            "work_area_name": s["work_area_name"],
            "project_id": s.get("project_id"),
            "project_name": s.get("project_name"),
            "composite_risk": s.get("composite_risk"),
            "pest_control_needed": s.get("pest_control_needed"),
            "disease_control_needed": s.get("disease_control_needed"),
            "rain_mm_next_48h": s.get("rain_mm_next_48h"),
            "forecast_summary": s.get("forecast_summary"),
        }
        for s in threat.get("sites", [])
        if s.get("composite_risk") in ("moderate", "high", "critical")
    ][:10]

    weather_alerts = [
        {
            "work_area_id": s["work_area_id"],
            "work_area_name": s["work_area_name"],
            "project_id": s.get("project_id"),
            "alert": a,
        }
        for s in threat.get("sites", [])
        for a in s.get("weather_alerts", [])
        if a.get("severity") in ("warning", "critical")
    ][:20]

    early_warnings = [
        {
            "work_area_id": s["work_area_id"],
            "work_area_name": s["work_area_name"],
            "project_id": s.get("project_id"),
            **w,
        }
        for s in threat.get("sites", [])
        for w in s.get("early_warnings", [])
    ][:15]

    # Biodiversity snapshot coverage
    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    project_ids = [p.id for p in (await db.execute(stmt)).scalars().all()]

    snapshot_count = 0
    species_total = 0
    if project_ids:
        fence_ids_stmt = select(PlantationFence.id).where(
            PlantationFence.project_id.in_(project_ids)
        )
        fence_ids = [r[0] for r in (await db.execute(fence_ids_stmt)).all()]
        if fence_ids:
            latest = (
                await db.execute(
                    select(func.count(func.distinct(WorkAreaBiodiversitySnapshot.fence_id)))
                    .where(WorkAreaBiodiversitySnapshot.fence_id.in_(fence_ids))
                )
            ).scalar_one()
            snapshot_count = int(latest or 0)
            species_res = await db.execute(
                select(WorkAreaBiodiversitySnapshot)
                .where(WorkAreaBiodiversitySnapshot.fence_id.in_(fence_ids))
                .order_by(WorkAreaBiodiversitySnapshot.captured_at.desc())
                .limit(50)
            )
            seen: set[str] = set()
            for snap in species_res.scalars().all():
                for sp in snap.species or []:
                    name = sp.get("scientific_name") or sp.get("common_name")
                    if name:
                        seen.add(name)
            species_total = len(seen)

    threat_summary = threat.get("summary", {})

    fusion = await build_portfolio_satellite_fusion(
        db, user, site_limit=min(site_limit, 8), live_bhoonidhi_limit=3
    )

    return {
        **field_ops,
        "generated_at": datetime.now(UTC).isoformat(),
        "integrations": integrations,
        "threat_summary": threat_summary,
        "threat_sites": threat.get("sites", [])[:site_limit],
        "pest_hotspots": pest_hotspots,
        "weather_alerts": weather_alerts,
        "early_warnings": early_warnings,
        "biodiversity": {
            "work_areas_with_snapshots": snapshot_count,
            "unique_species_in_latest_snapshots": species_total,
        },
        "satellite_fusion": {
            "summary": fusion.get("summary", {}),
            "sites": fusion.get("sites", [])[:8],
        },
        "highest_risk": threat_summary.get("highest_risk", "low"),
        "weather_alert_count": threat_summary.get("weather_alerts_count", 0),
        "pest_high_count": threat_summary.get("pest_high_count", 0),
    }


def intelligence_context_for_assistant(summary: dict[str, Any]) -> dict[str, Any]:
    """Compact slice for LLM grounding."""
    return {
        "highest_risk": summary.get("highest_risk"),
        "weather_alert_count": summary.get("weather_alert_count"),
        "pest_high_count": summary.get("pest_high_count"),
        "pest_hotspots": summary.get("pest_hotspots", [])[:5],
        "weather_alerts": summary.get("weather_alerts", [])[:5],
        "early_warnings": summary.get("early_warnings", [])[:5],
        "biodiversity": summary.get("biodiversity"),
        "integrations_status": summary.get("integrations", {}).get("status"),
        "satellite_fusion": summary.get("satellite_fusion", {}).get("summary"),
    }
