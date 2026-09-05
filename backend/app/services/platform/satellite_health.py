"""Platform admin — satellite provider health and live vs stub scan telemetry."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.services.monitoring.job_runs import get_recent_job_runs
from app.services.monitoring.sar_sweep_health import classify_sar_provider
from app.services.satellite.bhoonidhi_client import has_bhoonidhi_credentials
from app.services.satellite.gee_sar_sampler import _initialize_gee, gee_python_available
from app.services.satellite.plantation import has_sentinel_credentials
from app.services.satellite.sar_service import (
    get_sar_service,
    has_sar_credentials,
    is_sar_provider_record,
    live_sar_provider_name,
    provider_mode_configured,
)
from app.services.satellite.sentinel_hub_sar import sentinel_hub_sar_configured

SCAN_WINDOW_DAYS = 30
SATELLITE_JOB_NAMES = {
    "monthly_satellite_sweep",
    "daily_satellite_health_digest",
    "monthly_sar_sweep",
    "weekly_sar_integrity_watch",
    "daily_sar_sweep_health",
    "daily_tree_scan_sweep",
    "daily_satellite_watch_sweep",
    "weekly_tree_scan_target_backfill",
}


def _is_optical_live(provider: str | None) -> bool:
    if not provider or is_sar_provider_record(provider):
        return False
    p = provider.lower()
    if "stub" in p or "estimate" in p or p in {"simulated", "demo"}:
        return False
    return "sentinel" in p or p.startswith("gee") or "copernicus" in p


def _classify_scan(provider: str | None) -> str:
    if not provider:
        return "other"
    if is_sar_provider_record(provider):
        kind = classify_sar_provider(provider)
        return "sar_live" if kind == "live" else "sar_stub" if kind == "stub" else "sar_other"
    return "optical_live" if _is_optical_live(provider) else "optical_stub"


def _aggregate_provider_rows(rows: list[tuple[str | None, int]]) -> dict[str, Any]:
    totals = {
        "optical_live": 0,
        "optical_stub": 0,
        "sar_live": 0,
        "sar_stub": 0,
        "sar_other": 0,
        "total": 0,
    }
    by_provider: list[dict[str, Any]] = []
    for provider, count in rows:
        c = int(count)
        totals["total"] += c
        bucket = _classify_scan(provider)
        if bucket in totals:
            totals[bucket] += c
        by_provider.append(
            {
                "provider": provider or "unknown",
                "count": c,
                "bucket": bucket,
                "modality": "sar" if is_sar_provider_record(provider or "") else "optical",
            }
        )
    by_provider.sort(key=lambda r: r["count"], reverse=True)
    return {**totals, "by_provider": by_provider[:20]}


async def _scan_counts_since(db: AsyncSession, since: datetime) -> dict[str, Any]:
    fence_rows = (
        await db.execute(
            select(PlantationSatelliteRecord.provider, func.count())
            .where(PlantationSatelliteRecord.scene_acquired_at >= since)
            .group_by(PlantationSatelliteRecord.provider)
        )
    ).all()
    tree_rows = (
        await db.execute(
            select(SatelliteRecord.provider, func.count())
            .where(SatelliteRecord.scene_acquired_at >= since)
            .group_by(SatelliteRecord.provider)
        )
    ).all()

    fence_agg = _aggregate_provider_rows(list(fence_rows))
    tree_agg = _aggregate_provider_rows(list(tree_rows))

    latest_fence = (
        await db.execute(
            select(PlantationSatelliteRecord.provider, PlantationSatelliteRecord.scene_acquired_at)
            .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
            .limit(1)
        )
    ).first()
    latest_sar_fence = (
        await db.execute(
            select(PlantationSatelliteRecord.provider, PlantationSatelliteRecord.scene_acquired_at)
            .where(
                PlantationSatelliteRecord.provider.ilike("%sar%")
                | PlantationSatelliteRecord.provider.ilike("%nisar%")
            )
            .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
            .limit(1)
        )
    ).first()

    return {
        "window_days": SCAN_WINDOW_DAYS,
        "since": since.isoformat(),
        "plantation_fences": fence_agg,
        "trees": tree_agg,
        "combined": {
            "optical_live": fence_agg["optical_live"] + tree_agg["optical_live"],
            "optical_stub": fence_agg["optical_stub"] + tree_agg["optical_stub"],
            "sar_live": fence_agg["sar_live"] + tree_agg["sar_live"],
            "sar_stub": fence_agg["sar_stub"] + tree_agg["sar_stub"],
            "total": fence_agg["total"] + tree_agg["total"],
        },
        "latest_plantation_scan": (
            {
                "provider": latest_fence[0],
                "scene_acquired_at": latest_fence[1].isoformat() if latest_fence[1] else None,
            }
            if latest_fence
            else None
        ),
        "latest_sar_scan": (
            {
                "provider": latest_sar_fence[0],
                "scene_acquired_at": latest_sar_fence[1].isoformat() if latest_sar_fence[1] else None,
            }
            if latest_sar_fence
            else None
        ),
    }


def _provider_status() -> dict[str, Any]:
    optical_configured = has_sentinel_credentials()
    bhoonidhi_configured = has_bhoonidhi_credentials()
    gee_configured = bool(settings.gee_service_account_json)
    gee_ready = gee_configured and gee_python_available() and _initialize_gee()
    sar_primary = settings.sar_provider
    sar_fallback = settings.sar_fallback_provider

    return {
        "optical": {
            "label": "Copernicus Sentinel-2 (NDVI)",
            "configured": optical_configured,
            "mode": "live" if optical_configured else "stub",
            "provider_tag": "sentinel-2" if optical_configured else "sentinel-2-stub",
        },
        "sar": {
            "label": "Sentinel-1 SAR (NISAR-inspired analytics)",
            "enabled": settings.sar_enabled,
            "primary": sar_primary,
            "fallback": sar_fallback,
            "service_name": get_sar_service().name,
            "live_data_provider": live_sar_provider_name(),
            "credentials_ready": has_sar_credentials(),
            "gee_configured": gee_configured,
            "gee_initialized": gee_ready if gee_configured else False,
            "sentinel_hub_sar_configured": sentinel_hub_sar_configured(),
            "primary_configured": provider_mode_configured(sar_primary),
            "fallback_configured": (
                provider_mode_configured(sar_fallback)
                if sar_fallback and sar_fallback != "stub"
                else False
            ),
        },
        "bhoonidhi": {
            "label": "ISRO Bhoonidhi (STAC catalog)",
            "configured": bhoonidhi_configured,
            "mode": "live" if bhoonidhi_configured else "not_configured",
        },
    }


async def _recent_satellite_jobs(db: AsyncSession) -> list[dict[str, Any]]:
    jobs = await get_recent_job_runs(db, limit=40)
    out: list[dict[str, Any]] = []
    for job in jobs:
        if job.get("job_name") not in SATELLITE_JOB_NAMES:
            continue
        result = job.get("result") or {}
        entry: dict[str, Any] = {
            "job_name": job.get("job_name"),
            "status": job.get("status"),
            "finished_at": job.get("finished_at"),
            "error": job.get("error"),
        }
        if job.get("job_name") in {"monthly_sar_sweep", "weekly_sar_integrity_watch"}:
            entry["stub_scans"] = result.get("stub_scans")
            entry["live_scans"] = result.get("live_scans")
            entry["scanned"] = result.get("scanned")
            entry["failed"] = result.get("failed")
        elif job.get("job_name") == "monthly_satellite_sweep":
            entry["scanned"] = result.get("scanned")
            entry["failed"] = result.get("failed")
        out.append(entry)
    return out[:15]


def _overall_status(providers: dict[str, Any], scans: dict[str, Any]) -> str:
    combined = scans.get("combined") or {}
    sar_stub = int(combined.get("sar_stub") or 0)
    sar_live = int(combined.get("sar_live") or 0)
    optical_stub = int(combined.get("optical_stub") or 0)

    if not providers["sar"]["credentials_ready"] and settings.sar_enabled:
        return "degraded"
    if sar_live == 0 and sar_stub > 0:
        return "degraded"
    if optical_stub > 0 and not providers["optical"]["configured"]:
        return "degraded"
    if sar_stub > 0 and sar_live > 0:
        return "degraded"
    return "ok"


async def build_satellite_health_panel(db: AsyncSession) -> dict[str, Any]:
    since = datetime.now(UTC) - timedelta(days=SCAN_WINDOW_DAYS)
    providers = _provider_status()
    scans = await _scan_counts_since(db, since)
    jobs = await _recent_satellite_jobs(db)
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "status": _overall_status(providers, scans),
        "providers": providers,
        "scans": scans,
        "recent_jobs": jobs,
    }
