"""Unified NDVI + SAR + Forest Integrity scan history for work areas."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject
from app.services.monitoring.sar_sweep import serialize_sar_record
from app.services.satellite.sar_service import is_sar_provider_record


@dataclass
class ScanHistoryRow:
    scan_date: date
    fence_id: uuid.UUID
    fence_name: str
    ndvi_mean: float | None = None
    ndvi_change_vs_baseline: float | None = None
    cloud_cover_pct: float | None = None
    ndvi_provider: str | None = None
    sar_provider: str | None = None
    forest_integrity_score: float | None = None
    integrity_grade: str | None = None
    sar_monitoring_mode: str | None = None
    sar_ground_status: str | None = None
    sar_risk_level: str | None = None
    scene_ids: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "scan_date": self.scan_date.isoformat(),
            "fence_id": str(self.fence_id),
            "fence_name": self.fence_name,
            "ndvi_mean": self.ndvi_mean,
            "ndvi_change_vs_baseline": self.ndvi_change_vs_baseline,
            "cloud_cover_pct": self.cloud_cover_pct,
            "ndvi_provider": self.ndvi_provider,
            "sar_provider": self.sar_provider,
            "forest_integrity_score": self.forest_integrity_score,
            "integrity_grade": self.integrity_grade,
            "sar_monitoring_mode": self.sar_monitoring_mode,
            "sar_ground_status": self.sar_ground_status,
            "sar_risk_level": self.sar_risk_level,
            "scene_ids": self.scene_ids,
        }


def _row_key(fence_id: uuid.UUID, scan_date: date) -> tuple[uuid.UUID, date]:
    return fence_id, scan_date


def _merge_optical(row: ScanHistoryRow, rec: PlantationSatelliteRecord) -> None:
    row.ndvi_mean = float(rec.ndvi_mean) if rec.ndvi_mean is not None else row.ndvi_mean
    row.ndvi_change_vs_baseline = (
        float(rec.change_vs_baseline) if rec.change_vs_baseline is not None else row.ndvi_change_vs_baseline
    )
    row.cloud_cover_pct = (
        float(rec.cloud_cover_pct) if rec.cloud_cover_pct is not None else row.cloud_cover_pct
    )
    row.ndvi_provider = rec.provider
    if rec.scene_id and rec.scene_id not in row.scene_ids:
        row.scene_ids.append(rec.scene_id)


def _merge_sar(row: ScanHistoryRow, rec: PlantationSatelliteRecord) -> None:
    serialized = serialize_sar_record(rec)
    analysis = serialized.get("analysis") or {}
    fusion = serialized.get("fusion") or {}
    row.sar_provider = rec.provider
    row.sar_ground_status = analysis.get("ground_status")
    row.sar_risk_level = analysis.get("risk_level")
    if fusion:
        score = fusion.get("forest_integrity_score")
        if score is not None:
            row.forest_integrity_score = float(score)
        row.integrity_grade = fusion.get("integrity_grade")
        row.sar_monitoring_mode = fusion.get("monitoring_mode")
    if rec.scene_id and rec.scene_id not in row.scene_ids:
        row.scene_ids.append(rec.scene_id)


def build_fence_scan_history_rows(
    fence: PlantationFence,
    records: list[PlantationSatelliteRecord],
) -> list[ScanHistoryRow]:
    """Merge optical NDVI and SAR records by calendar date for one work area."""
    merged: dict[tuple[uuid.UUID, date], ScanHistoryRow] = {}
    for rec in records:
        scan_date = rec.scene_acquired_at.date() if isinstance(rec.scene_acquired_at, datetime) else rec.scene_acquired_at
        key = _row_key(fence.id, scan_date)
        row = merged.get(key)
        if row is None:
            row = ScanHistoryRow(
                scan_date=scan_date,
                fence_id=fence.id,
                fence_name=fence.name,
            )
            merged[key] = row
        if is_sar_provider_record(rec.provider):
            _merge_sar(row, rec)
        else:
            _merge_optical(row, rec)

    return sorted(merged.values(), key=lambda r: r.scan_date, reverse=True)


async def build_fence_scan_history(
    db: AsyncSession,
    fence: PlantationFence,
    *,
    limit: int = 48,
) -> list[ScanHistoryRow]:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence.id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(limit * 2)
    )
    records = list(res.scalars().all())
    rows = build_fence_scan_history_rows(fence, records)
    return rows[:limit]


async def build_project_scan_history(
    db: AsyncSession,
    project: PlantingProject,
    *,
    fence_id: uuid.UUID | None = None,
    limit: int = 96,
) -> list[ScanHistoryRow]:
    stmt = (
        select(PlantationFence)
        .where(PlantationFence.project_id == project.id)
        .order_by(PlantationFence.name.asc())
    )
    if fence_id is not None:
        stmt = stmt.where(PlantationFence.id == fence_id)
    fences = list((await db.execute(stmt)).scalars().all())
    if not fences:
        return []

    fence_ids = [f.id for f in fences]
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id.in_(fence_ids))
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(limit * 3)
    )
    records = list(res.scalars().all())
    by_fence: dict[uuid.UUID, list[PlantationSatelliteRecord]] = {fid: [] for fid in fence_ids}
    for rec in records:
        by_fence.setdefault(rec.fence_id, []).append(rec)

    fence_by_id = {f.id: f for f in fences}
    rows: list[ScanHistoryRow] = []
    for fid, fence_records in by_fence.items():
        fence = fence_by_id.get(fid)
        if fence is None:
            continue
        rows.extend(build_fence_scan_history_rows(fence, fence_records))

    rows.sort(key=lambda r: (r.scan_date, r.fence_name), reverse=True)
    return rows[:limit]


async def build_portfolio_scan_history(
    db: AsyncSession,
    projects: list[PlantingProject],
    *,
    limit: int = 96,
) -> list[ScanHistoryRow]:
    rows: list[ScanHistoryRow] = []
    per_project = max(12, limit // max(len(projects), 1))
    for project in projects:
        rows.extend(await build_project_scan_history(db, project, limit=per_project))
    rows.sort(key=lambda r: (r.scan_date, r.fence_name), reverse=True)
    return rows[:limit]
