"""AI tree analysis endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.carbon import CarbonCalculation
from app.models.tree import Tree
from app.models.tree_analysis import TreeAnalysis
from app.models.tree_image import TreeImage
from app.schemas.analysis import (
    AnalysisJob,
    AnalysisOut,
    AnalysisRequest,
    AssistantAnswer,
    AssistantQuery,
)
from app.services.ai import get_ai_service
from app.services.ai.types import GrowthContext
from app.services.carbon import CarbonInputs, estimate_carbon
from app.services.storage import get_storage

router = APIRouter(tags=["analysis"])


def _fetch_image_bytes(s3_keys: list[str]) -> list[bytes]:
    storage = get_storage()
    images: list[bytes] = []
    for k in s3_keys:
        b = storage.get_bytes(k)
        if b:
            images.append(b)
    if not images and s3_keys:
        images = [k.encode("utf-8") for k in s3_keys]
    if not images:
        images = [b"no-image"]
    return images


async def _run_tree_analysis(
    payload: AnalysisRequest, user: CurrentUser, db: DB
) -> TreeAnalysis:
    res = await db.execute(select(Tree).where(Tree.id == payload.tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if user.role != "admin" and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    img_rows = (
        await db.execute(select(TreeImage).where(TreeImage.tree_id == tree.id))
    ).scalars().all()
    images = _fetch_image_bytes([i.s3_key for i in img_rows])

    age = None
    if tree.planted_at:
        age = (datetime.now(UTC).date() - tree.planted_at).days / 365.25

    ai = get_ai_service()
    result = await ai.full_analysis(
        images=images,
        species_hint=tree.species_text,
        ctx=GrowthContext(
            species_scientific=tree.species_text,
            age_years=age,
            photo_count=len(img_rows),
        ),
    )

    carbon = estimate_carbon(
        CarbonInputs(
            species=result.species.top.scientific_name,
            dbh_cm=result.growth.dbh_cm,
            height_m=result.growth.height_m,
            age_years=age,
        )
    )

    rec = TreeAnalysis(
        tree_id=tree.id,
        triggered_by=user.id,
        model_pipeline=result.pipeline,
        model_versions=result.versions,
        species_id=None,
        species_confidence=result.species.top.confidence,
        species_topk=[
            {"scientific": p.scientific_name, "common": p.common_name, "confidence": p.confidence}
            for p in result.species.topk
        ],
        health=result.health.health_class,
        health_confidence=result.health.confidence,
        diseases_detected=[
            {"name": d.name, "confidence": d.confidence, "severity": d.severity}
            for d in result.health.diseases
        ],
        estimated_height_m=result.growth.height_m,
        estimated_dbh_cm=result.growth.dbh_cm,
        estimated_canopy_m=result.growth.canopy_m,
        estimated_biomass_kg=result.growth.biomass_kg,
        recommendations=[
            {"type": r.type, "text": r.text, "priority": r.priority}
            for r in result.recommendations
        ],
        overall_confidence=result.overall_confidence,
        raw_output={"carbon": carbon.__dict__},
    )
    db.add(rec)

    db.add(
        CarbonCalculation(
            tree_id=tree.id,
            methodology=carbon.methodology,
            inputs={
                "species": result.species.top.scientific_name,
                "dbh_cm": result.growth.dbh_cm,
                "height_m": result.growth.height_m,
                "age_years": age,
                "source": "tree_analysis",
            },
            agb_kg=carbon.agb_kg,
            bgb_kg=carbon.bgb_kg,
            total_biomass_kg=carbon.total_biomass_kg,
            carbon_kg=carbon.carbon_kg,
            co2e_kg=carbon.co2e_kg,
            annual_sequestration_kg=carbon.annual_sequestration_kg,
            lifetime_credits_tco2e=carbon.lifetime_credits_tco2e,
            estimated_revenue_usd=carbon.estimated_revenue_usd,
            price_assumption_usd=12.0,
            confidence=carbon.confidence,
            engine_version=carbon.engine_version,
        )
    )

    tree.species_text = tree.species_text or result.species.top.common_name
    tree.current_health = result.health.health_class
    tree.current_dbh_cm = result.growth.dbh_cm
    tree.current_height_m = result.growth.height_m
    tree.current_canopy_m = result.growth.canopy_m
    tree.current_carbon_kg = carbon.carbon_kg
    tree.last_analysis_at = datetime.now(UTC)
    if tree.status == "pending":
        tree.status = "active"

    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/tree-analysis", response_model=AnalysisOut)
async def run_analysis(payload: AnalysisRequest, user: CurrentUser, db: DB) -> AnalysisOut:
    rec = await _run_tree_analysis(payload, user, db)
    return AnalysisOut.model_validate(rec)


@router.post("/tree-analysis/async", response_model=AnalysisJob, status_code=status.HTTP_202_ACCEPTED)
async def enqueue_analysis(payload: AnalysisRequest, user: CurrentUser, db: DB) -> AnalysisJob:
    """Queue tree analysis on Celery when available; otherwise run synchronously."""
    from app.services.workers.enqueue import try_enqueue
    from app.workers.tasks import run_ai_analysis

    res = await db.execute(select(Tree).where(Tree.id == payload.tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if user.role != "admin" and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    task_id = try_enqueue(
        run_ai_analysis, str(payload.tree_id), str(user.id), payload.mode
    )
    if task_id:
        return AnalysisJob(
            job_id=task_id,
            status="queued",
            synchronous=False,
        )

    rec = await _run_tree_analysis(payload, user, db)
    return AnalysisJob(
        job_id=str(rec.id),
        analysis_id=str(rec.id),
        status="completed",
        synchronous=True,
    )


@router.get("/trees/{tree_id}/analyses", response_model=list[AnalysisOut])
async def list_analyses(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> list[AnalysisOut]:
    res = await db.execute(
        select(TreeAnalysis).where(TreeAnalysis.tree_id == tree_id).order_by(
            TreeAnalysis.created_at.desc()
        )
    )
    rows = res.scalars().all()
    return [AnalysisOut.model_validate(r) for r in rows]


@router.post("/assistant/query", response_model=AssistantAnswer)
async def assistant(payload: AssistantQuery, user: CurrentUser, db: DB) -> AssistantAnswer:
    from app.services.ai.assistant_service import run_assistant

    out = await run_assistant(payload.prompt, user, db, tree_id=payload.tree_id)
    return AssistantAnswer(**out)
