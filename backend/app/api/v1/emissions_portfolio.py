"""Org-level GHG emissions portfolio rollup."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.deps import DB, CurrentUser
from app.services.emissions.portfolio_summary import build_emissions_portfolio_summary
from app.services.platform.governance import assert_org_feature_enabled

router = APIRouter(prefix="/emissions", tags=["emissions"])


@router.get("/portfolio-summary")
async def get_emissions_portfolio_summary(user: CurrentUser, db: DB) -> dict:
    await assert_org_feature_enabled(db, user, "satellite")
    return await build_emissions_portfolio_summary(db, user)
