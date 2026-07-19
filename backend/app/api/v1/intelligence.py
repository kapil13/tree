"""Phase 4 intelligence hub — external data fused for supervisors."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.v1.deps import DB, CurrentUser
from app.schemas.intelligence import (
    IntegrationsHealthOut,
    IntelligenceSummaryOut,
    SatelliteFusionSummaryOut,
)
from app.services.intelligence.integrations import build_integrations_health
from app.services.intelligence.satellite_fusion import build_portfolio_satellite_fusion
from app.services.intelligence.summary import build_intelligence_summary

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/summary", response_model=IntelligenceSummaryOut)
async def intelligence_summary(
    user: CurrentUser,
    db: DB,
    site_limit: int = Query(15, ge=1, le=30),
    fast: bool = Query(
        True,
        description="Fast mode skips live Bhoonidhi queries and remote integration pings",
    ),
) -> IntelligenceSummaryOut:
    """Portfolio intelligence: weather, pest, threat watch, biodiversity, integrations."""
    return IntelligenceSummaryOut.model_validate(
        await build_intelligence_summary(db, user, site_limit=site_limit, fast=fast)
    )


@router.get("/integrations", response_model=IntegrationsHealthOut)
async def integrations_health(user: CurrentUser) -> IntegrationsHealthOut:
    """Status of external data providers (Open-Meteo, GBIF, Sentinel, Bhoonidhi, IUCN)."""
    return IntegrationsHealthOut.model_validate(await build_integrations_health())


@router.get("/satellite-fusion", response_model=SatelliteFusionSummaryOut)
async def satellite_fusion(
    user: CurrentUser,
    db: DB,
    site_limit: int = Query(15, ge=1, le=30),
    live_bhoonidhi_limit: int = Query(5, ge=0, le=15),
) -> SatelliteFusionSummaryOut:
    """Fuse Sentinel-2 NDVI records with Bhoonidhi STAC scenes per work area."""
    return SatelliteFusionSummaryOut.model_validate(
        await build_portfolio_satellite_fusion(
            db,
            user,
            site_limit=site_limit,
            live_bhoonidhi_limit=live_bhoonidhi_limit,
        )
    )
