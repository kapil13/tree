"""Build T0–T4 temporal timeline from Sentinel monthly series."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_satellite import AuditSatelliteBaseline, AuditTemporalObservation
from app.models.planting_project import PlantingProject
from app.services.audit_satellite.providers import assert_audit_provider
from app.services.geo import geography_to_geojson_polygon
from app.services.satellite.plantation import series_plantation_polygon

PHASE_ORDER = ("t0", "t1", "t2", "t3", "t4", "current")


def _assign_phases(
    samples: list[tuple[datetime, dict[str, Any]]],
    planting_date: datetime | None,
) -> list[tuple[str, datetime, dict[str, Any]]]:
    """Bucket monthly samples into T0–T4 + current."""
    if not samples:
        return []

    samples = sorted(samples, key=lambda x: x[0])
    if planting_date is None:
        planting_date = samples[0][0]

    if len(samples) == 1:
        return [("current", samples[0][0], samples[0][1])]

    # T0 = closest sample at or before planting date
    t0_idx = 0
    for i, (ts, _) in enumerate(samples):
        if ts <= planting_date:
            t0_idx = i
        else:
            break

    labeled: list[tuple[str, datetime, dict[str, Any]]] = []
    labeled.append(("t0", samples[t0_idx][0], samples[t0_idx][1]))

    remaining = [s for i, s in enumerate(samples) if i != t0_idx]
    if not remaining:
        return labeled

    # Split remaining into t1-t4 quartiles by time
    post = [s for s in remaining if s[0] > samples[t0_idx][0]]
    if not post:
        labeled.append(("current", samples[-1][0], samples[-1][1]))
        return labeled

    quartile_labels = ["t1", "t2", "t3", "t4"]
    step = max(1, len(post) // len(quartile_labels))
    used_indices: set[int] = set()
    for qi, label in enumerate(quartile_labels):
        idx = min(qi * step, len(post) - 1)
        if idx in used_indices:
            continue
        used_indices.add(idx)
        labeled.append((label, post[idx][0], post[idx][1]))

    labeled.append(("current", samples[-1][0], samples[-1][1]))
    return labeled


async def build_temporal_timeline(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
    *,
    months: int = 60,
) -> list[AuditTemporalObservation]:
    if engagement.status not in {"intake_complete", "analysis_ready"}:
        raise ValueError("intake_not_complete")

    baselines = (
        await db.execute(
            select(AuditSatelliteBaseline).where(
                AuditSatelliteBaseline.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    baseline_map = {b.boundary_version_id: b for b in baselines}

    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()

    all_obs: list[AuditTemporalObservation] = []
    for bv in boundaries:
        baseline = baseline_map.get(bv.id)
        t0_ndvi = float(baseline.t0_ndvi_mean) if baseline and baseline.t0_ndvi_mean else None
        planting_dt = None
        if baseline and baseline.planting_date:
            planting_dt = datetime(
                baseline.planting_date.year,
                baseline.planting_date.month,
                baseline.planting_date.day,
                tzinfo=UTC,
            )

        geojson = geography_to_geojson_polygon(bv.boundary)
        try:
            series = await series_plantation_polygon(geojson, months=months)
        except RuntimeError:
            continue

        raw_samples: list[tuple[datetime, dict[str, Any]]] = []
        for sample in series:
            assert_audit_provider(sample.provider)
            stats = sample.indices or {}
            stats["mean"] = sample.ndvi_mean
            raw_samples.append((sample.scene_acquired_at, stats))

        phases = _assign_phases(raw_samples, planting_dt)
        for phase, ts, stats in phases:
            ndvi = stats.get("ndvi_mean", stats.get("mean"))
            ndvi_f = round(float(ndvi), 4) if ndvi is not None else None
            change = round(ndvi_f - t0_ndvi, 4) if ndvi_f is not None and t0_ndvi is not None else None

            existing = (
                await db.execute(
                    select(AuditTemporalObservation).where(
                        AuditTemporalObservation.engagement_id == engagement.id,
                        AuditTemporalObservation.boundary_version_id == bv.id,
                        AuditTemporalObservation.phase == phase,
                    )
                )
            ).scalar_one_or_none()

            scene_id = f"S2_{phase}_{ts.strftime('%Y%m%d')}_{bv.id.hex[:8]}"
            if existing:
                row = existing
            else:
                row = AuditTemporalObservation(
                    engagement_id=engagement.id,
                    boundary_version_id=bv.id,
                    fence_id=bv.fence_id,
                    phase=phase,
                    scene_acquired_at=ts,
                    scene_id=scene_id,
                    provider="sentinel-2",
                    epistemic_label="OBSERVATION",
                    observed_at=datetime.now(UTC),
                )
                db.add(row)

            row.scene_acquired_at = ts
            row.ndvi_mean = ndvi_f
            row.evi_mean = stats.get("evi_mean")
            row.change_vs_t0 = change
            row.indices = {k: v for k, v in stats.items() if isinstance(v, int | float)}
            row.fence_id = bv.fence_id
            all_obs.append(row)

    await db.flush()
    return all_obs


async def satellite_timeline_summary(
    db: AsyncSession, engagement_id: uuid.UUID
) -> dict[str, Any]:
    baselines = (
        await db.execute(
            select(AuditSatelliteBaseline).where(
                AuditSatelliteBaseline.engagement_id == engagement_id
            )
        )
    ).scalars().all()
    observations = (
        await db.execute(
            select(AuditTemporalObservation)
            .where(AuditTemporalObservation.engagement_id == engagement_id)
            .order_by(AuditTemporalObservation.scene_acquired_at.asc())
        )
    ).scalars().all()
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
        )
    ).scalars().all()
    blocks: list[dict[str, Any]] = []
    for bv in boundaries:
        bl = next((b for b in baselines if b.boundary_version_id == bv.id), None)
        obs = [o for o in observations if o.boundary_version_id == bv.id]
        obs_sorted = sorted(obs, key=lambda o: PHASE_ORDER.index(o.phase) if o.phase in PHASE_ORDER else 99)
        blocks.append(
            {
                "boundary_version_id": str(bv.id),
                "boundary_name": bv.name,
                "fence_id": str(bv.fence_id) if bv.fence_id else None,
                "baseline": _serialize_baseline(bl) if bl else None,
                "timeline": [_serialize_obs(o) for o in obs_sorted],
            }
        )

    t0_complete = sum(1 for b in baselines if b.backfill_status == "found")
    return {
        "engagement_id": str(engagement_id),
        "block_count": len(boundaries),
        "t0_baselines_found": t0_complete,
        "audit_mode": True,
        "blocks": blocks,
    }


def _serialize_baseline(bl: AuditSatelliteBaseline) -> dict[str, Any]:
    return {
        "id": str(bl.id),
        "planting_date": bl.planting_date.isoformat() if bl.planting_date else None,
        "t0_scene_acquired_at": bl.t0_scene_acquired_at.isoformat() if bl.t0_scene_acquired_at else None,
        "t0_scene_id": bl.t0_scene_id,
        "t0_provider": bl.t0_provider,
        "t0_ndvi_mean": float(bl.t0_ndvi_mean) if bl.t0_ndvi_mean is not None else None,
        "t0_evi_mean": float(bl.t0_evi_mean) if bl.t0_evi_mean is not None else None,
        "backfill_status": bl.backfill_status,
        "epistemic_label": bl.epistemic_label,
    }


def _serialize_obs(obs: AuditTemporalObservation) -> dict[str, Any]:
    return {
        "id": str(obs.id),
        "phase": obs.phase,
        "scene_acquired_at": obs.scene_acquired_at.isoformat(),
        "scene_id": obs.scene_id,
        "provider": obs.provider,
        "ndvi_mean": float(obs.ndvi_mean) if obs.ndvi_mean is not None else None,
        "evi_mean": float(obs.evi_mean) if obs.evi_mean is not None else None,
        "change_vs_t0": float(obs.change_vs_t0) if obs.change_vs_t0 is not None else None,
        "epistemic_label": obs.epistemic_label,
    }


async def mark_analysis_ready(
    db: AsyncSession,
    engagement: AuditEngagement,
) -> AuditEngagement:
    baselines = (
        await db.execute(
            select(AuditSatelliteBaseline).where(
                AuditSatelliteBaseline.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()

    if not boundaries:
        raise ValueError("no_boundaries")
    if len(baselines) < len(boundaries):
        raise ValueError("baselines_incomplete")
    if any(b.backfill_status != "found" for b in baselines):
        raise ValueError("t0_baseline_not_found_for_all_blocks")

    obs_count = (
        await db.execute(
            select(AuditTemporalObservation).where(
                AuditTemporalObservation.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    if len(obs_count) < len(boundaries):
        raise ValueError("timeline_incomplete")

    engagement.status = "analysis_ready"
    meta = dict(engagement.metadata_ or {})
    meta["analysis_ready_at"] = datetime.now(UTC).isoformat()
    engagement.metadata_ = meta
    await db.flush()
    return engagement
