"""Citizen BYOT engagement — adoption, stewardship, gamification."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.schemas.citizen import (
    AdoptByCodeRequest,
    AdoptTreeRequest,
    CitizenFastSignupCompleteRequest,
    CitizenFastSignupStartRequest,
    CitizenProfileOut,
    GamificationEventOut,
    StewardshipSummaryOut,
)
from app.schemas.common import Page
from app.services.auth.signup import (
    SignupError,
    complete_citizen_fast_signup,
    start_citizen_fast_signup,
)
from app.services.citizen.adoption import (
    AdoptionError,
    adopt_tree,
    adopt_tree_by_public_code,
    list_adoptable_trees,
    list_stewardship,
    relinquish_adoption,
)
from app.services.citizen.gamification import build_citizen_profile_out, mark_onboarding_step

router = APIRouter(prefix="/citizen", tags=["citizen"])


@router.get("/profile", response_model=CitizenProfileOut)
async def citizen_profile(user: CurrentUser, db: DB) -> CitizenProfileOut:
    return CitizenProfileOut.model_validate(await build_citizen_profile_out(db, user))


@router.get("/stewardship", response_model=StewardshipSummaryOut)
async def citizen_stewardship(user: CurrentUser, db: DB) -> StewardshipSummaryOut:
    return StewardshipSummaryOut.model_validate(await list_stewardship(db, user=user))


@router.get("/adoptable", response_model=Page[dict])
async def citizen_adoptable_trees(
    user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> Page[dict]:
    items, total = await list_adoptable_trees(db, user=user, page=page, page_size=page_size)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("/trees/{tree_id}/adopt", response_model=GamificationEventOut)
async def citizen_adopt_tree(
    tree_id: uuid.UUID,
    payload: AdoptTreeRequest,
    user: WriteAccess,
    db: DB,
) -> GamificationEventOut:
    try:
        await adopt_tree(db, user=user, tree_id=tree_id, nickname=payload.nickname)
        await db.commit()
    except AdoptionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    profile = await build_citizen_profile_out(db, user)
    return GamificationEventOut(
        points=profile["points"],
        new_badges=[b for b in profile["badges"] if b.get("id") == "adopter"][-1:]
        if any(b.get("id") == "adopter" for b in profile["badges"])
        else [],
    )


@router.delete("/trees/{tree_id}/adopt", status_code=204, response_class=Response)
async def citizen_relinquish_tree(tree_id: uuid.UUID, user: WriteAccess, db: DB) -> Response:
    try:
        await relinquish_adoption(db, user=user, tree_id=tree_id)
        await db.commit()
    except AdoptionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    return Response(status_code=204)


@router.post("/adopt-by-code", response_model=GamificationEventOut)
async def citizen_adopt_by_code(
    payload: AdoptByCodeRequest,
    user: WriteAccess,
    db: DB,
) -> GamificationEventOut:
    try:
        await adopt_tree_by_public_code(
            db,
            user=user,
            public_code=payload.public_code,
            nickname=payload.nickname,
        )
        await db.commit()
    except AdoptionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    profile = await build_citizen_profile_out(db, user)
    return GamificationEventOut(points=profile["points"], new_badges=[])


@router.post("/onboarding/{step_id}", status_code=204, response_class=Response)
async def citizen_mark_onboarding_step(step_id: str, user: CurrentUser, db: DB) -> Response:
    await mark_onboarding_step(db, user, step_id)
    await db.commit()
    return Response(status_code=204)


@router.post("/signup/start", response_model=dict)
async def citizen_fast_signup_start(payload: CitizenFastSignupStartRequest, db: DB) -> dict:
    try:
        token, dev_hint = await start_citizen_fast_signup(
            db,
            full_name=payload.full_name,
            phone=payload.phone,
            password=payload.password,
        )
    except SignupError as exc:
        code = exc.code
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if code in ("phone_taken",):
            status_code = status.HTTP_409_CONFLICT
        raise HTTPException(status_code, detail=code) from exc
    return {"signup_token": token, "dev_hint": dev_hint, "sms_enabled": True}


@router.post("/signup/complete", response_model=dict)
async def citizen_fast_signup_complete(payload: CitizenFastSignupCompleteRequest, db: DB) -> dict:
    from app.api.v1.auth import _tokens_for

    try:
        user = await complete_citizen_fast_signup(db, payload.signup_token, payload.code)
        await db.commit()
    except SignupError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc
    return _tokens_for(user).model_dump()
