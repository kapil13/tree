"""Public marketing site visit tracking."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.site_visit import SiteVisit


def _start_of_today_utc() -> datetime:
    now = datetime.now(UTC)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def record_site_visit(
    db: AsyncSession,
    *,
    visitor_id: str,
    path: str,
    ip: str | None,
    user_agent: str | None,
    referrer: str | None,
    locale: str | None,
) -> bool:
    """Record a page view. Returns False when the same visitor already hit this path today."""
    today_start = _start_of_today_utc()
    existing = (
        await db.execute(
            select(SiteVisit.id)
            .where(
                SiteVisit.visitor_id == visitor_id,
                SiteVisit.path == path,
                SiteVisit.created_at >= today_start,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return False

    db.add(
        SiteVisit(
            visitor_id=visitor_id,
            path=path[:512],
            ip=ip,
            user_agent=user_agent,
            referrer=referrer[:1024] if referrer else None,
            locale=locale,
        )
    )
    await db.flush()
    return True


async def get_site_visit_stats(db: AsyncSession) -> dict[str, int]:
    today_start = _start_of_today_utc()
    total = int((await db.execute(select(func.count()).select_from(SiteVisit))).scalar_one() or 0)
    today = int(
        (
            await db.execute(
                select(func.count())
                .select_from(SiteVisit)
                .where(SiteVisit.created_at >= today_start)
            )
        ).scalar_one()
        or 0
    )
    unique_today = int(
        (
            await db.execute(
                select(func.count(func.distinct(SiteVisit.visitor_id))).where(
                    SiteVisit.created_at >= today_start
                )
            )
        ).scalar_one()
        or 0
    )
    return {"total": total, "today": today, "unique_today": unique_today}


async def query_site_visits(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    ip: str | None = None,
    path: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> tuple[list[SiteVisit], int]:
    stmt = select(SiteVisit)
    count_stmt = select(func.count()).select_from(SiteVisit)

    if ip:
        stmt = stmt.where(SiteVisit.ip == ip)
        count_stmt = count_stmt.where(SiteVisit.ip == ip)
    if path:
        stmt = stmt.where(SiteVisit.path.ilike(f"%{path}%"))
        count_stmt = count_stmt.where(SiteVisit.path.ilike(f"%{path}%"))
    if date_from:
        stmt = stmt.where(SiteVisit.created_at >= date_from)
        count_stmt = count_stmt.where(SiteVisit.created_at >= date_from)
    if date_to:
        stmt = stmt.where(SiteVisit.created_at <= date_to)
        count_stmt = count_stmt.where(SiteVisit.created_at <= date_to)
    if search:
        pattern = f"%{search}%"
        search_filter = (
            SiteVisit.path.ilike(pattern)
            | SiteVisit.referrer.ilike(pattern)
            | SiteVisit.user_agent.ilike(pattern)
            | SiteVisit.visitor_id.ilike(pattern)
        )
        if "." in search:
            search_filter = search_filter | SiteVisit.ip == search
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    total = int((await db.execute(count_stmt)).scalar_one() or 0)
    offset = (page - 1) * page_size
    rows = (
        await db.execute(
            stmt.order_by(SiteVisit.created_at.desc()).offset(offset).limit(page_size)
        )
    ).scalars().all()
    return list(rows), total
