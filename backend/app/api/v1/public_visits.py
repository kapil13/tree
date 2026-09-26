"""Public marketing site visit tracking."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.v1.deps import DB
from app.core.rate_limit import rate_limit
from app.schemas.site_visit import SiteVisitCreate, SiteVisitRecordedOut, SiteVisitStatsOut
from app.services.analytics.site_visits import get_site_visit_stats, record_site_visit
from app.services.audit.request import client_ip, client_user_agent

public_router = APIRouter(prefix="/public", tags=["public"])


@public_router.post(
    "/visits",
    response_model=SiteVisitRecordedOut,
    dependencies=[rate_limit(120, 60)],
)
async def record_public_visit(
    request: Request,
    db: DB,
    payload: SiteVisitCreate,
) -> SiteVisitRecordedOut:
    recorded = await record_site_visit(
        db,
        visitor_id=payload.visitor_id,
        path=payload.path,
        ip=client_ip(request),
        user_agent=client_user_agent(request),
        referrer=request.headers.get("referer"),
        locale=payload.locale,
    )
    await db.commit()
    return SiteVisitRecordedOut(recorded=recorded)


@public_router.get("/visits/stats", response_model=SiteVisitStatsOut)
async def public_visit_stats(db: DB) -> SiteVisitStatsOut:
    stats = await get_site_visit_stats(db)
    return SiteVisitStatsOut.model_validate(stats)
