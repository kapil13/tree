"""Audience onboarding API — presets and org audience selection."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.v1.deps import DB, CurrentUser
from app.services.auth.user_profile import user_has_professional_program
from app.services.onboarding.audience import AudienceError, normalize_audience
from app.services.onboarding.audience_presets import get_audience_preset, list_audience_presets
from app.services.onboarding.audience_storage import set_user_planting_audience
from app.services.planting_programs.enrollment import list_user_program_codes
from app.services.planting_programs.onboarding import _latest_professional_request

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class AudiencePresetOut(BaseModel):
    code: str
    label: str
    description: str
    recommended_program_code: str
    recommended_scheme_codes: list[str]
    recommended_template_code: str | None
    recommended_segment: str
    checklist_codes: list[str]
    dashboard_highlights: list[str]


class AudiencePresetListOut(BaseModel):
    items: list[AudiencePresetOut]


class AudienceSelectIn(BaseModel):
    audience: str = Field(min_length=3, max_length=32)


class AudienceSelectOut(BaseModel):
    audience: str


@router.get("/audience-presets", response_model=AudiencePresetListOut)
async def audience_presets(user: CurrentUser) -> AudiencePresetListOut:
    del user
    return AudiencePresetListOut(
        items=[AudiencePresetOut.model_validate(preset) for preset in list_audience_presets()]
    )


@router.get("/audience-presets/{code}", response_model=AudiencePresetOut)
async def audience_preset_detail(code: str, user: CurrentUser) -> AudiencePresetOut:
    del user
    preset = get_audience_preset(code)
    if preset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audience_not_found")
    return AudiencePresetOut.model_validate(preset)


@router.post("/audience", response_model=AudienceSelectOut)
async def select_planting_audience(
    payload: AudienceSelectIn, user: CurrentUser, db: DB
) -> AudienceSelectOut:
    try:
        normalize_audience(payload.audience)
    except AudienceError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.code) from exc

    request = await _latest_professional_request(db, user.id)
    can_set = user.organization_id is not None or (
        request is not None and request.status in {"draft", "rejected"}
    )
    if not can_set:
        enrolled = await list_user_program_codes(db, user.id)
        can_set = user_has_professional_program(enrolled)
    if not can_set:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="onboarding_not_started")

    try:
        audience = await set_user_planting_audience(db, user, payload.audience)
        await db.commit()
    except AudienceError as exc:
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if exc.code == "organization_not_found":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code, detail=exc.code) from exc

    return AudienceSelectOut(audience=audience)
