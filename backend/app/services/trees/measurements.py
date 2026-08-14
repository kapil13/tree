"""Tree measurement time-series — append-only MRV provenance."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_measurement import TreeMeasurement
from app.schemas.tree_measurement import TreeMeasurementCreate

# Default measurement uncertainty (%) by method — used when caller omits explicit values.
DEFAULT_UNCERTAINTY_DBH_PCT: dict[str, float] = {
    "tape": 2.0,
    "caliper": 1.0,
    "clinometer": 5.0,
    "photogrammetry": 5.0,
    "ai_estimate": 15.0,
    "visual_estimate": 20.0,
}

DEFAULT_UNCERTAINTY_HEIGHT_PCT: dict[str, float] = {
    "tape": 5.0,
    "caliper": 5.0,
    "clinometer": 3.0,
    "photogrammetry": 5.0,
    "ai_estimate": 15.0,
    "visual_estimate": 25.0,
}


def _as_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def default_uncertainty(method: str) -> tuple[float | None, float | None]:
    return (
        DEFAULT_UNCERTAINTY_DBH_PCT.get(method),
        DEFAULT_UNCERTAINTY_HEIGHT_PCT.get(method),
    )


async def sync_tree_current_from_latest(db: AsyncSession, tree: Tree) -> None:
    """Materialise trees.current_* from the latest measurement row."""
    res = await db.execute(
        select(TreeMeasurement)
        .where(TreeMeasurement.tree_id == tree.id)
        .order_by(TreeMeasurement.measured_at.desc(), TreeMeasurement.created_at.desc())
        .limit(1)
    )
    latest = res.scalar_one_or_none()
    if latest is None:
        return
    if latest.dbh_cm is not None:
        tree.current_dbh_cm = latest.dbh_cm
    if latest.height_m is not None:
        tree.current_height_m = latest.height_m
    if latest.canopy_m is not None:
        tree.current_canopy_m = latest.canopy_m


async def create_measurement(
    db: AsyncSession,
    *,
    tree: Tree,
    payload: TreeMeasurementCreate,
    measurer_id: uuid.UUID,
) -> TreeMeasurement:
    measured_at = payload.measured_at or datetime.now(UTC)
    unc_dbh = payload.uncertainty_dbh_pct
    unc_height = payload.uncertainty_height_pct
    if unc_dbh is None or unc_height is None:
        default_dbh, default_height = default_uncertainty(payload.method)
        if unc_dbh is None:
            unc_dbh = default_dbh if payload.dbh_cm is not None else None
        if unc_height is None:
            unc_height = default_height if payload.height_m is not None else None

    row = TreeMeasurement(
        tree_id=tree.id,
        measured_at=measured_at,
        source=payload.source,
        method=payload.method,
        instrument=payload.instrument,
        measurer_id=measurer_id,
        dbh_cm=payload.dbh_cm,
        height_m=payload.height_m,
        canopy_m=payload.canopy_m,
        gps_accuracy_m=payload.gps_accuracy_m,
        photo_key=payload.photo_key,
        notes=payload.notes,
        uncertainty_dbh_pct=unc_dbh,
        uncertainty_height_pct=unc_height,
    )
    db.add(row)
    await db.flush()
    await sync_tree_current_from_latest(db, tree)
    return row


async def list_measurements(
    db: AsyncSession,
    tree_id: uuid.UUID,
    *,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[TreeMeasurement], int]:
    total = (
        await db.execute(
            select(func.count())
            .select_from(TreeMeasurement)
            .where(TreeMeasurement.tree_id == tree_id)
        )
    ).scalar_one()

    stmt = (
        select(TreeMeasurement)
        .where(TreeMeasurement.tree_id == tree_id)
        .order_by(TreeMeasurement.measured_at.desc(), TreeMeasurement.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), int(total or 0)


def measurement_to_dict(row: TreeMeasurement) -> dict:
    return {
        "id": str(row.id),
        "tree_id": str(row.tree_id),
        "measured_at": row.measured_at.isoformat(),
        "source": row.source,
        "method": row.method,
        "instrument": row.instrument,
        "measurer_id": str(row.measurer_id) if row.measurer_id else None,
        "dbh_cm": _as_float(row.dbh_cm),
        "height_m": _as_float(row.height_m),
        "canopy_m": _as_float(row.canopy_m),
        "gps_accuracy_m": _as_float(row.gps_accuracy_m),
        "photo_key": row.photo_key,
        "notes": row.notes,
        "uncertainty_dbh_pct": _as_float(row.uncertainty_dbh_pct),
        "uncertainty_height_pct": _as_float(row.uncertainty_height_pct),
        "created_at": row.created_at.isoformat(),
    }
