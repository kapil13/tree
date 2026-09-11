"""T0 baseline establishment anchored to frozen claim planting date."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit_engagement import AuditEngagement, BoundaryVersion, ClaimSnapshot
from app.models.audit_satellite import AuditSatelliteBaseline
from app.models.planting_project import PlantingProject
from app.services.audit_satellite.providers import assert_audit_provider
from app.services.geo import geography_to_geojson_polygon, polygon_coordinates
from app.services.satellite.plantation import has_sentinel_credentials, scan_plantation_polygon
from app.services.satellite.sentinel_hub import SentinelHubClient


def _parse_planting_date(claim_data: dict[str, Any]) -> date | None:
    raw = claim_data.get("planting_date")
    if not raw:
        return None
    if isinstance(raw, date):
        return raw
    try:
        return date.fromisoformat(str(raw)[:10])
    except ValueError:
        return None


async def _latest_claim_snapshot(db: AsyncSession, engagement_id: uuid.UUID) -> ClaimSnapshot | None:
    row = await db.execute(
        select(ClaimSnapshot)
        .where(ClaimSnapshot.engagement_id == engagement_id)
        .order_by(ClaimSnapshot.version.desc())
        .limit(1)
    )
    return row.scalar_one_or_none()


def _sentinel_client() -> SentinelHubClient:
    return SentinelHubClient(
        settings.sentinel_hub_client_id or "",
        settings.sentinel_hub_client_secret or "",
        api_base_url=settings.sentinel_hub_api_url,
        token_url=settings.sentinel_hub_token_url,
    )


async def _fetch_t0_sample(
    boundary_geojson: dict[str, Any],
    planting_date: date | None,
) -> dict[str, Any] | None:
    """Fetch T0 scene at or before planting date; fall back to latest with audit guard."""
    coords = polygon_coordinates(boundary_geojson)

    if has_sentinel_credentials() and planting_date:
        anchor = datetime(
            planting_date.year,
            planting_date.month,
            planting_date.day,
            tzinfo=UTC,
        )
        client = _sentinel_client()
        sample = await client.fetch_polygon_latest_sample(coords, when=anchor)
        if sample:
            ts, stats = sample
            provider = "sentinel-2"
            assert_audit_provider(provider)
            ndvi = stats.get("ndvi_mean", stats.get("mean"))
            return {
                "scene_acquired_at": ts,
                "scene_id": f"S2_T0_{ts.strftime('%Y%m%d')}",
                "provider": provider,
                "ndvi_mean": round(float(ndvi), 4) if ndvi is not None else None,
                "evi_mean": round(float(stats.get("evi_mean", 0)), 4)
                if stats.get("evi_mean") is not None
                else None,
                "indices": {k: v for k, v in stats.items() if isinstance(v, int | float)},
            }

    result = await scan_plantation_polygon(boundary_geojson, require_sentinel=True)
    assert_audit_provider(result.provider)
    sample = result.sample
    return {
        "scene_acquired_at": sample.scene_acquired_at,
        "scene_id": sample.scene_id,
        "provider": result.provider,
        "ndvi_mean": sample.ndvi_mean,
        "evi_mean": sample.evi_mean,
        "indices": sample.indices or {},
    }


async def establish_t0_baselines(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
) -> list[AuditSatelliteBaseline]:
    if engagement.status not in {"intake_complete", "analysis_ready"}:
        raise ValueError("intake_not_complete")

    snapshot = await _latest_claim_snapshot(db, engagement.id)
    if snapshot is None:
        raise ValueError("no_frozen_claim")

    planting_date = _parse_planting_date(snapshot.claim_data or {})
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    if not boundaries:
        raise ValueError("no_boundaries")

    results: list[AuditSatelliteBaseline] = []
    for bv in boundaries:
        existing = (
            await db.execute(
                select(AuditSatelliteBaseline).where(
                    AuditSatelliteBaseline.engagement_id == engagement.id,
                    AuditSatelliteBaseline.boundary_version_id == bv.id,
                )
            )
        ).scalar_one_or_none()

        geojson = geography_to_geojson_polygon(bv.boundary)
        try:
            t0 = await _fetch_t0_sample(geojson, planting_date)
            backfill_status = "found" if t0 else "not_found"
        except ValueError as exc:
            if "stub_not_allowed" in str(exc):
                backfill_status = "stub_rejected"
                t0 = None
            else:
                raise

        if existing:
            row = existing
        else:
            row = AuditSatelliteBaseline(
                engagement_id=engagement.id,
                boundary_version_id=bv.id,
                fence_id=bv.fence_id,
                planting_date=planting_date,
                epistemic_label="OBSERVATION",
            )
            db.add(row)

        row.planting_date = planting_date
        row.fence_id = bv.fence_id
        row.backfill_status = backfill_status
        if t0:
            row.t0_scene_acquired_at = t0["scene_acquired_at"]
            row.t0_scene_id = t0["scene_id"]
            row.t0_provider = t0["provider"]
            row.t0_ndvi_mean = t0["ndvi_mean"]
            row.t0_evi_mean = t0["evi_mean"]
            row.t0_indices = t0.get("indices") or {}
        else:
            row.t0_scene_acquired_at = None
            row.t0_scene_id = None
            row.t0_provider = None
            row.t0_ndvi_mean = None
            row.t0_evi_mean = None
            row.t0_indices = {}

        results.append(row)

    await db.flush()
    return results
