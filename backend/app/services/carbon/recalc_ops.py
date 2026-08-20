"""Persist carbon recalculation for a tree (API + worker)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.carbon import CarbonCalculation
from app.models.tree import Tree
from app.models.tree_measurement import TreeMeasurement
from app.models.user import User
from app.schemas.carbon import CarbonEstimateResponse
from app.services.carbon import CarbonInputs, estimate_carbon


async def recalculate_tree_carbon(
    db: AsyncSession,
    *,
    tree_id: uuid.UUID,
    user: User,
) -> CarbonEstimateResponse:
    res = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if user.role != "admin" and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    age_years = None
    if tree.planted_at:
        age_years = (datetime.now(UTC).date() - tree.planted_at).days / 365.25

    meas_res = await db.execute(
        select(TreeMeasurement)
        .where(TreeMeasurement.tree_id == tree.id)
        .order_by(TreeMeasurement.measured_at.desc(), TreeMeasurement.created_at.desc())
        .limit(1)
    )
    latest_meas = meas_res.scalar_one_or_none()

    calc = estimate_carbon(
        CarbonInputs(
            species=tree.species_text or "Neem",
            dbh_cm=float(tree.current_dbh_cm) if tree.current_dbh_cm else None,
            height_m=float(tree.current_height_m) if tree.current_height_m else None,
            age_years=age_years,
            measurement_method=latest_meas.method if latest_meas else None,
            uncertainty_dbh_pct=(
                float(latest_meas.uncertainty_dbh_pct)
                if latest_meas and latest_meas.uncertainty_dbh_pct is not None
                else None
            ),
            uncertainty_height_pct=(
                float(latest_meas.uncertainty_height_pct)
                if latest_meas and latest_meas.uncertainty_height_pct is not None
                else None
            ),
        )
    )
    db.add(
        CarbonCalculation(
            tree_id=tree.id,
            methodology=calc.methodology,
            inputs={
                "species": tree.species_text,
                "dbh_cm": float(tree.current_dbh_cm) if tree.current_dbh_cm else None,
                "height_m": float(tree.current_height_m) if tree.current_height_m else None,
                "age_years": age_years,
                "measurement_method": latest_meas.method if latest_meas else None,
                "source": "recalculate",
            },
            agb_kg=calc.agb_kg,
            bgb_kg=calc.bgb_kg,
            total_biomass_kg=calc.total_biomass_kg,
            carbon_kg=calc.carbon_kg,
            co2e_kg=calc.co2e_kg,
            co2e_kg_lower_90=calc.co2e_kg_lower_90,
            co2e_kg_upper_90=calc.co2e_kg_upper_90,
            uncertainty_pct=calc.uncertainty_pct,
            verra_deduction_pct=calc.verra_deduction_pct,
            creditable_co2e_kg=calc.creditable_co2e_kg,
            annual_sequestration_kg=calc.annual_sequestration_kg,
            lifetime_credits_tco2e=calc.lifetime_credits_tco2e,
            estimated_revenue_usd=calc.estimated_revenue_usd,
            price_assumption_usd=12.0,
            confidence=calc.confidence,
            engine_version=calc.engine_version,
        )
    )
    tree.current_carbon_kg = calc.carbon_kg
    await db.commit()
    return CarbonEstimateResponse(**calc.__dict__)
