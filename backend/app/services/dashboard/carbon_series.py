"""Dashboard carbon trajectory from real portfolio data."""

from __future__ import annotations

from calendar import month_abbr
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.carbon import CarbonCalculation
from app.models.tree import Tree
from app.models.user import User
from app.schemas.dashboard import SeriesPoint


def _scope_trees(stmt, user: User):
    if user.role == "admin":
        return stmt
    if user.organization_id:
        return stmt.where(
            (Tree.owner_user_id == user.id) | (Tree.organization_id == user.organization_id)
        )
    return stmt.where(Tree.owner_user_id == user.id)


def _month_end(year: int, month: int) -> datetime:
    if month == 12:
        return datetime(year + 1, 1, 1, tzinfo=UTC)
    return datetime(year, month + 1, 1, tzinfo=UTC)


async def build_carbon_growth_series(db: AsyncSession, user: User, *, months: int = 6) -> list[SeriesPoint]:
    """
    Cumulative stored carbon (kg) at the end of each of the last N months.

    Prefers monthly snapshots from `carbon_calculations` when available; otherwise
    sums `current_carbon_kg` for trees planted/created on or before each month end.
    """
    now = datetime.now(UTC)
    month_keys: list[tuple[int, int]] = []
    y, m = now.year, now.month
    for _ in range(months):
        month_keys.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    month_keys.reverse()

    tree_ids_stmt = _scope_trees(select(Tree.id), user)
    tree_ids = [row[0] for row in (await db.execute(tree_ids_stmt)).all()]
    if not tree_ids:
        return [SeriesPoint(label=f"{month_abbr[m]} {yr}", value=0.0) for yr, m in month_keys]

    calc_stmt = (
        select(
            func.date_trunc("month", CarbonCalculation.created_at).label("month"),
            func.sum(CarbonCalculation.carbon_kg).label("delta"),
        )
        .where(CarbonCalculation.tree_id.in_(tree_ids))
        .group_by("month")
        .order_by("month")
    )
    calc_rows = (await db.execute(calc_stmt)).all()
    if calc_rows:
        monthly_delta: dict[tuple[int, int], float] = {}
        for row in calc_rows:
            month_dt: datetime = row.month
            key = (month_dt.year, month_dt.month)
            monthly_delta[key] = float(row.delta or 0)

        cumulative = 0.0
        points: list[SeriesPoint] = []
        for yr, mo in month_keys:
            cumulative += monthly_delta.get((yr, mo), 0.0)
            points.append(SeriesPoint(label=f"{month_abbr[mo]} {yr}", value=round(cumulative, 2)))
        if any(p.value > 0 for p in points):
            return points

    points = []
    for yr, mo in month_keys:
        cutoff = _month_end(yr, mo)
        stmt = select(func.coalesce(func.sum(Tree.current_carbon_kg), 0)).where(
            Tree.id.in_(tree_ids),
            or_(
                Tree.planted_at < cutoff.date(),
                (Tree.planted_at.is_(None)) & (Tree.registered_at < cutoff),
            ),
        )
        total = float((await db.execute(stmt)).scalar() or 0)
        points.append(SeriesPoint(label=f"{month_abbr[mo]} {yr}", value=round(total, 2)))
    return points
