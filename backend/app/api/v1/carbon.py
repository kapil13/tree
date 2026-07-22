"""Carbon endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.carbon import CarbonCalculation
from app.models.tree import Tree
from app.schemas.carbon import CarbonEstimateRequest, CarbonEstimateResponse
from app.services.audit import record_audit
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
async def recalculate(
    tree_id: uuid.UUID, request: Request, user: CurrentUser, db: DB
) -> CarbonEstimateResponse:
    from app.services.carbon.recalc_ops import recalculate_tree_carbon

    result = await recalculate_tree_carbon(db, tree_id=tree_id, user=user)
    await record_audit(
        db,
        actor=user,
        action="carbon.recalculate",
        resource_type="tree",
        resource_id=tree_id,
        request=request,
        diff={"carbon_kg": result.carbon_kg, "engine_version": result.engine_version},
    )
    await db.commit()
    return result


@router.post("/recalculate/{tree_id}/async", status_code=status.HTTP_202_ACCEPTED)
async def recalculate_async(
    tree_id: uuid.UUID, user: CurrentUser, db: DB
) -> dict:
    """Queue carbon recalculation on the Celery worker when available."""
    from app.services.carbon.recalc_ops import recalculate_tree_carbon
    from app.services.workers.enqueue import try_enqueue
    from app.workers.tasks import recalc_carbon as recalc_carbon_task

    # Access check without mutating data
    res = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if user.role != "admin" and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    task_id = try_enqueue(recalc_carbon_task, str(tree_id), str(user.id))
    if task_id:
        return {"tree_id": str(tree_id), "status": "queued", "celery_task_id": task_id}

    result = await recalculate_tree_carbon(db, tree_id=tree_id, user=user)
    return {
        "tree_id": str(tree_id),
        "status": "completed",
        "carbon_kg": result.carbon_kg,
        "synchronous": True,
    }


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
