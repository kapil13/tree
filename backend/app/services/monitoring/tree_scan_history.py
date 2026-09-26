"""Tree-level NDVI scan history for portfolio and project monitoring."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planting_project import PlantingProject
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.services.data_scope import apply_tree_scope
from app.services.planting_projects.access import project_list_filter


@dataclass
class TreeScanHistoryRow:
    scan_date: date
    tree_id: uuid.UUID
    tree_code: str
    species_text: str | None = None
    project_id: uuid.UUID | None = None
    project_name: str | None = None
    work_area_id: uuid.UUID | None = None
    work_area_name: str | None = None
    ndvi_mean: float | None = None
    ndvi_change_vs_baseline: float | None = None
    cloud_cover_pct: float | None = None
    provider: str | None = None
    presence_confirmed: bool | None = None
    scene_ids: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "scan_date": self.scan_date.isoformat(),
            "tree_id": str(self.tree_id),
            "tree_code": self.tree_code,
            "species_text": self.species_text,
            "project_id": str(self.project_id) if self.project_id else None,
            "project_name": self.project_name,
            "work_area_id": str(self.work_area_id) if self.work_area_id else None,
            "work_area_name": self.work_area_name,
            "ndvi_mean": self.ndvi_mean,
            "ndvi_change_vs_baseline": self.ndvi_change_vs_baseline,
            "cloud_cover_pct": self.cloud_cover_pct,
            "provider": self.provider,
            "presence_confirmed": self.presence_confirmed,
            "scene_ids": self.scene_ids,
        }


def build_tree_scan_history_rows(
    tree: Tree,
    records: list[SatelliteRecord],
    *,
    project_name: str | None = None,
    work_area_name: str | None = None,
) -> list[TreeScanHistoryRow]:
    """Merge satellite records by calendar date for one tree."""
    merged: dict[tuple[uuid.UUID, date], TreeScanHistoryRow] = {}
    for rec in records:
        scan_date = (
            rec.scene_acquired_at.date()
            if isinstance(rec.scene_acquired_at, datetime)
            else rec.scene_acquired_at
        )
        key = (tree.id, scan_date)
        row = merged.get(key)
        if row is None:
            row = TreeScanHistoryRow(
                scan_date=scan_date,
                tree_id=tree.id,
                tree_code=tree.public_code,
                species_text=tree.species_text,
                project_id=tree.project_id,
                project_name=project_name,
                work_area_id=tree.plantation_id,
                work_area_name=work_area_name,
            )
            merged[key] = row
        row.ndvi_mean = float(rec.ndvi_mean) if rec.ndvi_mean is not None else row.ndvi_mean
        row.ndvi_change_vs_baseline = (
            float(rec.change_vs_baseline)
            if rec.change_vs_baseline is not None
            else row.ndvi_change_vs_baseline
        )
        row.cloud_cover_pct = (
            float(rec.cloud_cover_pct) if rec.cloud_cover_pct is not None else row.cloud_cover_pct
        )
        row.provider = rec.provider
        row.presence_confirmed = rec.presence_confirmed
        if rec.scene_id and rec.scene_id not in row.scene_ids:
            row.scene_ids.append(rec.scene_id)

    return sorted(merged.values(), key=lambda r: r.scan_date, reverse=True)


async def build_tree_scan_history(
    db: AsyncSession,
    tree: Tree,
    *,
    limit: int = 48,
) -> list[TreeScanHistoryRow]:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree.id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(limit * 2)
    )
    records = list(res.scalars().all())
    project_name = tree.project.name if tree.project else None
    work_area_name = tree.work_area.name if tree.work_area else None
    rows = build_tree_scan_history_rows(
        tree,
        records,
        project_name=project_name,
        work_area_name=work_area_name,
    )
    return rows[:limit]


async def _trees_for_projects(
    db: AsyncSession,
    user,
    projects: list[PlantingProject],
    *,
    project_id: uuid.UUID | None = None,
) -> list[Tree]:
    project_ids = [p.id for p in projects]
    if project_id is not None:
        project_ids = [project_id] if project_id in project_ids else []
    if not project_ids:
        return []

    stmt = (
        select(Tree)
        .where(Tree.project_id.in_(project_ids))
        .options(selectinload(Tree.project), selectinload(Tree.work_area))
        .order_by(Tree.public_code.asc())
    )
    stmt = await apply_tree_scope(stmt, user, db)
    return list((await db.execute(stmt)).scalars().all())


async def build_project_tree_scan_history(
    db: AsyncSession,
    user,
    project: PlantingProject,
    *,
    limit: int = 96,
) -> list[TreeScanHistoryRow]:
    trees = await _trees_for_projects(db, user, [project])
    if not trees:
        return []

    tree_ids = [t.id for t in trees]
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id.in_(tree_ids))
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(limit * 3)
    )
    records = list(res.scalars().all())
    by_tree: dict[uuid.UUID, list[SatelliteRecord]] = {tid: [] for tid in tree_ids}
    for rec in records:
        by_tree.setdefault(rec.tree_id, []).append(rec)

    tree_by_id = {t.id: t for t in trees}
    rows: list[TreeScanHistoryRow] = []
    for tid, tree_records in by_tree.items():
        tree = tree_by_id.get(tid)
        if tree is None:
            continue
        rows.extend(
            build_tree_scan_history_rows(
                tree,
                tree_records,
                project_name=project.name,
                work_area_name=tree.work_area.name if tree.work_area else None,
            )
        )

    rows.sort(key=lambda r: (r.scan_date, r.tree_code), reverse=True)
    return rows[:limit]


async def build_portfolio_tree_scan_history(
    db: AsyncSession,
    user,
    *,
    limit: int = 96,
) -> list[TreeScanHistoryRow]:
    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())
    if not projects:
        return []

    trees = await _trees_for_projects(db, user, projects)
    if not trees:
        return []

    tree_ids = [t.id for t in trees]
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id.in_(tree_ids))
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(limit * 3)
    )
    records = list(res.scalars().all())
    by_tree: dict[uuid.UUID, list[SatelliteRecord]] = {tid: [] for tid in tree_ids}
    for rec in records:
        by_tree.setdefault(rec.tree_id, []).append(rec)

    project_by_id = {p.id: p for p in projects}
    tree_by_id = {t.id: t for t in trees}
    rows: list[TreeScanHistoryRow] = []
    for tid, tree_records in by_tree.items():
        tree = tree_by_id.get(tid)
        if tree is None:
            continue
        project = project_by_id.get(tree.project_id) if tree.project_id else None
        rows.extend(
            build_tree_scan_history_rows(
                tree,
                tree_records,
                project_name=project.name if project else None,
                work_area_name=tree.work_area.name if tree.work_area else None,
            )
        )

    rows.sort(key=lambda r: (r.scan_date, r.tree_code), reverse=True)
    return rows[:limit]
