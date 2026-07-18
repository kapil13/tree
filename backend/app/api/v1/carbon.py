"""Carbon endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.core.access import is_platform_admin
from app.models.carbon import CarbonCalculation
from app.models.tree import Tree
from app.schemas.carbon import CarbonEstimateRequest, CarbonEstimateResponse
from app.services.carbon import CarbonInputs, estimate_carbon

router = APIRouter(prefix="/carbon", tags=["carbon"])


@router.post("/estimate", response_model=CarbonEstimateResponse)
async def estimate(payload: CarbonEstimateRequest) -> CarbonEstimateResponse:
    res = estimate_carbon(
        CarbonInputs(
            species=payload.species,
            dbh_cm=payload.dbh_cm,
            height_m=payload.height_m,
            age_years=payload.age_years,
            wood_density=payload.wood_density,
            methodology=payload.methodology,
            climate_zone=payload.climate_zone,
            ecological_zone=payload.ecological_zone,
            price_usd_per_credit=payload.price_usd_per_credit,
            verification_tier=payload.verification_tier,
        )
    )
    return CarbonEstimateResponse(**res.__dict__)


@router.post("/recalculate/{tree_id}", response_model=CarbonEstimateResponse)
async def recalculate(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> CarbonEstimateResponse:
    res = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if not is_platform_admin(user) and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    age_years = None
    if tree.planted_at:
        age_years = (datetime.now(UTC).date() - tree.planted_at).days / 365.25

    calc = estimate_carbon(
        CarbonInputs(
            species=tree.species_text or "Neem",
            dbh_cm=float(tree.current_dbh_cm) if tree.current_dbh_cm else None,
            height_m=float(tree.current_height_m) if tree.current_height_m else None,
            age_years=age_years,
        )
    )
    rec = CarbonCalculation(
        tree_id=tree.id,
        methodology=calc.methodology,
        inputs={
            "species": tree.species_text,
            "dbh_cm": float(tree.current_dbh_cm) if tree.current_dbh_cm else None,
            "height_m": float(tree.current_height_m) if tree.current_height_m else None,
            "age_years": age_years,
        },
        agb_kg=calc.agb_kg,
        bgb_kg=calc.bgb_kg,
        total_biomass_kg=calc.total_biomass_kg,
        carbon_kg=calc.carbon_kg,
        co2e_kg=calc.co2e_kg,
        annual_sequestration_kg=calc.annual_sequestration_kg,
        lifetime_credits_tco2e=calc.lifetime_credits_tco2e,
        estimated_revenue_usd=calc.estimated_revenue_usd,
        price_assumption_usd=12.0,
        confidence=calc.confidence,
        engine_version=calc.engine_version,
    )
    db.add(rec)
    tree.current_carbon_kg = calc.carbon_kg
    await db.commit()
    return CarbonEstimateResponse(**calc.__dict__)


@router.get("-report/{tree_id}", name="carbon_report")
async def carbon_report(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> dict:
    res = await db.execute(
        select(CarbonCalculation)
        .where(CarbonCalculation.tree_id == tree_id)
        .order_by(CarbonCalculation.created_at.desc())
        .limit(1)
    )
    latest = res.scalar_one_or_none()
    if latest is None:
        raise HTTPException(404, detail="no_carbon_record")
    return {
        "tree_id": str(tree_id),
        "methodology": latest.methodology,
        "agb_kg": float(latest.agb_kg),
        "bgb_kg": float(latest.bgb_kg),
        "carbon_kg": float(latest.carbon_kg),
        "co2e_kg": float(latest.co2e_kg),
        "annual_sequestration_kg": float(latest.annual_sequestration_kg or 0),
        "lifetime_credits_tco2e": float(latest.lifetime_credits_tco2e or 0),
        "estimated_revenue_usd": float(latest.estimated_revenue_usd or 0),
        "confidence": float(latest.confidence or 0),
        "engine_version": latest.engine_version,
        "calculated_at": latest.created_at.isoformat(),
    }
