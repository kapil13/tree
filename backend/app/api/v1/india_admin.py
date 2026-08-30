"""India administrative geography API for project location fields."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.v1.deps import CurrentUser
from app.services.india_admin.service import IndiaAdminService

router = APIRouter(prefix="/india-admin", tags=["india-admin"])
_service = IndiaAdminService()


@router.get("/financial-years")
async def list_financial_years(user: CurrentUser) -> dict:
    del user
    return _service.financial_years()


@router.get("/states")
async def list_states(user: CurrentUser) -> dict:
    del user
    return {"items": _service.states()}


@router.get("/districts")
async def list_districts(
    user: CurrentUser,
    state_code: str = Query(..., min_length=1, max_length=8),
) -> dict:
    del user
    return {"items": _service.districts(state_code=state_code)}


@router.get("/cities")
async def list_cities(
    user: CurrentUser,
    state_code: str = Query(..., min_length=1, max_length=8),
) -> dict:
    del user
    return {"items": _service.cities(state_code=state_code)}


@router.get("/blocks")
async def list_blocks(
    user: CurrentUser,
    state_code: str = Query(..., min_length=1, max_length=8),
    district_code: str = Query(..., min_length=1, max_length=16),
) -> dict:
    del user
    return await _service.blocks(state_code=state_code, district_code=district_code)


@router.get("/gram-panchayats")
async def list_gram_panchayats(
    user: CurrentUser,
    block_code: str = Query(..., min_length=1, max_length=16),
    district_code: str | None = Query(None, max_length=16),
    state_code: str | None = Query(None, max_length=8),
) -> dict:
    del user
    return await _service.gram_panchayats(
        block_code=block_code,
        district_code=district_code,
        state_code=state_code,
    )


@router.get("/villages")
async def list_villages(
    user: CurrentUser,
    block_code: str | None = Query(None, max_length=16),
    gram_panchayat_code: str | None = Query(None, max_length=32),
    district_code: str | None = Query(None, max_length=16),
    state_code: str | None = Query(None, max_length=8),
) -> dict:
    del user
    return await _service.villages(
        block_code=block_code,
        gram_panchayat_code=gram_panchayat_code,
        district_code=district_code,
        state_code=state_code,
    )
