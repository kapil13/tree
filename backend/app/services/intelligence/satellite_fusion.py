"""Sentinel-2 NDVI + ISRO Bhoonidhi scene fusion per work area."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject
from app.services.geo import geography_to_geojson_polygon
from app.services.planting_projects.access import project_list_filter
from app.services.satellite.bhoonidhi_client import (
    get_bhoonidhi_client,
    has_bhoonidhi_credentials,
    summarize_stac_features,
)
from app.services.satellite.plantation import has_sentinel_credentials
from app.services.satellite.sar_service import get_sar_service
from app.services.monitoring.sar_sweep import latest_sar_record_for_fence, serialize_sar_record

log = get_logger("intelligence.satellite_fusion")

STALE_SCAN_DAYS = 35
NDVI_DECLINE_THRESHOLD = -0.08
BHOONIDHI_LIVE_TIMEOUT_SEC = 15.0


def _ndvi_trend(records: list[PlantationSatelliteRecord]) -> str:
    if len(records) < 2:
        return "unknown"
    ordered = sorted(records, key=lambda r: r.scene_acquired_at)
    recent = [float(r.ndvi_mean) for r in ordered[-3:] if r.ndvi_mean is not None]
    if len(recent) < 2:
        return "unknown"
    delta = recent[-1] - recent[0]
    if delta <= NDVI_DECLINE_THRESHOLD:
        return "declining"
    if delta >= 0.08:
        return "improving"
    return "stable"


def _fusion_status(sentinel: dict[str, Any], bhoonidhi: dict[str, Any], sar: dict[str, Any] | None = None) -> str:
    has_sentinel = sentinel.get("last_scan_at") is not None
    has_bhoonidhi = int(bhoonidhi.get("scenes_available") or 0) > 0
    has_sar = sar is not None and sar.get("last_scan_at") is not None
    if has_sentinel and has_bhoonidhi and has_sar:
        return "optical_sar_bhoonidhi"
    if has_sentinel and has_sar:
        return "optical_sar_aligned"
    if has_sentinel and has_bhoonidhi:
        return "aligned"
    if has_sentinel:
        return "sentinel_only"
    if has_sar and has_bhoonidhi:
        return "sar_bhoonidhi"
    if has_sar:
        return "sar_only"
    if has_bhoonidhi:
        return "bhoonidhi_only"
    return "none"


def _recommended_action(
    *,
    fusion_status: str,
    days_since_scan: int | None,
    ndvi_trend: str,
    scenes_available: int,
    sar_ground_status: str | None = None,
) -> str:
    if sar_ground_status in {"wetland_risk", "hidden_moisture"}:
        return (
            "SAR detected ground moisture or wetland risk under canopy — "
            "verify drainage and schedule a field check-in."
        )
    if fusion_status == "none":
        return "Draw a work-area boundary and run a Sentinel scan or configure Bhoonidhi credentials."
    if days_since_scan is not None and days_since_scan > STALE_SCAN_DAYS:
        return "Schedule a fresh Sentinel-2 scan — last NDVI capture is stale."
    if ndvi_trend == "declining":
        return "Investigate canopy stress; cross-check with Bhoonidhi scenes for recent cloud-free coverage."
    if fusion_status == "sentinel_only" and scenes_available == 0 and has_bhoonidhi_credentials():
        return "Sentinel NDVI is current; browse Bhoonidhi for IRS / ResourceSat archive scenes."
    if fusion_status == "bhoonidhi_only":
        return "Bhoonidhi scenes found; run Sentinel scan for quantitative NDVI trend."
    return "Continue routine dual-source monitoring."


async def _sar_layer(db: AsyncSession, fence: PlantationFence) -> dict[str, Any]:
    latest = await latest_sar_record_for_fence(db, fence.id)
    svc = get_sar_service()
    if latest is None:
        return {
            "configured": True,
            "provider": svc.name,
            "last_scan_at": None,
            "ground_status": None,
            "risk_level": None,
            "wetland_probability": None,
            "double_bounce_index": None,
            "canopy_ground_mismatch": False,
        }
    serialized = serialize_sar_record(latest)
    analysis = (latest.raw_metadata or {}).get("sar_analysis") or {}
    return {
        "configured": True,
        "provider": latest.provider,
        "last_scan_at": latest.scene_acquired_at.isoformat(),
        "ground_status": analysis.get("ground_status"),
        "risk_level": analysis.get("risk_level"),
        "wetland_probability": serialized.get("wetland_probability"),
        "double_bounce_index": serialized.get("double_bounce_index"),
        "ground_moisture_index": serialized.get("ground_moisture_index"),
        "canopy_ground_mismatch": serialized.get("canopy_ground_mismatch"),
        "l_band_hh_db": serialized.get("l_band_hh_db"),
        "s_band_hh_db": serialized.get("s_band_hh_db"),
    }


async def _sentinel_layer(db: AsyncSession, fence: PlantationFence) -> dict[str, Any]:
    records = list(
        (
            await db.execute(
                select(PlantationSatelliteRecord)
                .where(PlantationSatelliteRecord.fence_id == fence.id)
                .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
                .limit(6)
            )
        ).scalars().all()
    )
    latest = records[0] if records else None
    days_since = None
    if fence.last_satellite_at:
        days_since = (datetime.now(UTC) - fence.last_satellite_at).days
    elif latest:
        days_since = (datetime.now(UTC) - latest.scene_acquired_at).days

    return {
        "configured": has_sentinel_credentials(),
        "provider": latest.provider if latest else None,
        "last_scan_at": (
            fence.last_satellite_at.isoformat()
            if fence.last_satellite_at
            else (latest.scene_acquired_at.isoformat() if latest else None)
        ),
        "days_since_scan": days_since,
        "latest_ndvi": float(latest.ndvi_mean) if latest and latest.ndvi_mean is not None else None,
        "ndvi_trend": _ndvi_trend(records),
        "scene_id": latest.scene_id if latest else None,
        "stale": days_since is not None and days_since > STALE_SCAN_DAYS,
    }


async def _bhoonidhi_layer(
    boundary: dict[str, Any],
    *,
    live: bool = True,
) -> dict[str, Any]:
    if not has_bhoonidhi_credentials():
        return {
            "configured": False,
            "scenes_available": 0,
            "latest_scene_at": None,
            "collections": [],
            "online_scenes": 0,
        }
    if not live:
        return {
            "configured": True,
            "live": False,
            "scenes_available": 0,
            "latest_scene_at": None,
            "collections": [],
            "online_scenes": 0,
        }

    try:
        client = get_bhoonidhi_client()
        raw = await asyncio.wait_for(
            client.search_polygon(boundary, days_back=120, limit=10, online_only=True),
            timeout=BHOONIDHI_LIVE_TIMEOUT_SEC,
        )
        features = summarize_stac_features(raw)
        ctx = raw.get("context") or {}
        collections = sorted({f.get("collection") for f in features if f.get("collection")})
        latest_dt = None
        for feat in features:
            dt = feat.get("datetime")
            if dt and (latest_dt is None or dt > latest_dt):
                latest_dt = dt
        online = sum(1 for f in features if (f.get("online") or "").upper() == "Y")
        return {
            "configured": True,
            "live": True,
            "scenes_available": int(ctx.get("returned") or len(features)),
            "matched": int(ctx.get("matched") or 0) if ctx.get("matched") is not None else None,
            "latest_scene_at": latest_dt,
            "collections": collections[:5],
            "online_scenes": online,
            "sample_scene_ids": [f.get("id") for f in features[:3] if f.get("id")],
        }
    except TimeoutError:
        log.warning("bhoonidhi_fusion_timeout")
        return {
            "configured": True,
            "live": True,
            "error": "bhoonidhi_timeout",
            "scenes_available": 0,
            "latest_scene_at": None,
            "collections": [],
            "online_scenes": 0,
        }
    except Exception as exc:
        log.warning("bhoonidhi_fusion_failed", error=str(exc))
        return {
            "configured": True,
            "live": True,
            "error": str(exc),
            "scenes_available": 0,
            "latest_scene_at": None,
            "collections": [],
            "online_scenes": 0,
        }


async def build_fence_satellite_fusion(
    db: AsyncSession,
    fence: PlantationFence,
    *,
    project: PlantingProject | None = None,
    query_bhoonidhi: bool = True,
) -> dict[str, Any]:
    boundary = geography_to_geojson_polygon(fence.boundary)
    sentinel = await _sentinel_layer(db, fence)
    bhoonidhi = await _bhoonidhi_layer(boundary, live=query_bhoonidhi)
    sar = await _sar_layer(db, fence)
    status = _fusion_status(sentinel, bhoonidhi, sar)
    return {
        "work_area_id": str(fence.id),
        "work_area_name": fence.name,
        "project_id": str(fence.project_id) if fence.project_id else None,
        "project_name": project.name if project else None,
        "segment": project.segment if project else None,
        "sentinel": sentinel,
        "bhoonidhi": bhoonidhi,
        "sar": sar,
        "fusion_status": status,
        "recommended_action": _recommended_action(
            fusion_status=status,
            days_since_scan=sentinel.get("days_since_scan"),
            ndvi_trend=sentinel.get("ndvi_trend", "unknown"),
            scenes_available=int(bhoonidhi.get("scenes_available") or 0),
            sar_ground_status=sar.get("ground_status"),
        ),
    }


async def build_portfolio_satellite_fusion(
    db: AsyncSession,
    user,
    *,
    site_limit: int = 15,
    live_bhoonidhi_limit: int = 5,
) -> dict[str, Any]:
    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())
    project_by_id = {p.id: p for p in projects}
    fences: list[PlantationFence] = []
    if projects:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence)
                    .where(PlantationFence.project_id.in_(project_by_id.keys()))
                    .order_by(PlantationFence.name)
                )
            ).scalars().all()
        )

    sites: list[dict[str, Any]] = []
    stale_count = 0
    aligned_count = 0
    sentinel_only = 0
    bhoonidhi_only = 0
    sar_risk_count = 0

    for idx, fence in enumerate(fences[:site_limit]):
        project = project_by_id.get(fence.project_id) if fence.project_id else None
        live = idx < live_bhoonidhi_limit
        row = await build_fence_satellite_fusion(
            db, fence, project=project, query_bhoonidhi=live
        )
        sites.append(row)
        if row["sentinel"].get("stale"):
            stale_count += 1
        if row["fusion_status"] in {"aligned", "optical_sar_aligned", "optical_sar_bhoonidhi"}:
            aligned_count += 1
        elif row["fusion_status"] == "sentinel_only":
            sentinel_only += 1
        elif row["fusion_status"] == "bhoonidhi_only":
            bhoonidhi_only += 1
        sar_status = row.get("sar") or {}
        if sar_status.get("ground_status") in {"wetland_risk", "hidden_moisture", "moist"}:
            sar_risk_count += 1

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "work_areas_tracked": len(fences),
            "sites_in_view": len(sites),
            "stale_sentinel_scans": stale_count,
            "aligned_dual_source": aligned_count,
            "sentinel_only": sentinel_only,
            "bhoonidhi_only": bhoonidhi_only,
            "sar_ground_risk_sites": sar_risk_count,
            "sentinel_configured": has_sentinel_credentials(),
            "bhoonidhi_configured": has_bhoonidhi_credentials(),
            "sar_configured": True,
            "sar_provider": get_sar_service().name,
        },
        "sites": sites,
    }
