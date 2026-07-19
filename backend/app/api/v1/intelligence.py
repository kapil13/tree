"""Phase 4 intelligence hub — external data fused for supervisors."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.v1.deps import DB, CurrentUser
from app.schemas.intelligence import IntegrationsHealthOut, IntelligenceSummaryOut
from app.services.intelligence.integrations import build_integrations_health
from app.services.intelligence.summary import build_intelligence_summary

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/summary", response_model=IntelligenceSummaryOut)
async def intelligence_summary(
    user: CurrentUser,
    db: DB,
    site_limit: int = Query(15, ge=1, le=30),
) -> IntelligenceSummaryOut:
    """Portfolio intelligence: weather, pest, threat watch, biodiversity, integrations."""
    return IntelligenceSummaryOut.model_validate(
        await build_intelligence_summary(db, user, site_limit=site_limit)
    )


@router.get("/integrations", response_model=IntegrationsHealthOut)
async def integrations_health(user: CurrentUser) -> IntegrationsHealthOut:
    """Status of external data providers (Open-Meteo, GBIF, Sentinel, Bhoonidhi, IUCN)."""
    return IntegrationsHealthOut.model_validate(await build_integrations_health())
