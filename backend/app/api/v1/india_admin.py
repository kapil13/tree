"""India administrative geography API for project location fields."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.v1.deps import DB, CurrentUser
from app.services.india_admin.service import IndiaAdminService

router = APIRouter(prefix="/india-admin", tags=["india-admin"])
_service = IndiaAdminService()


@router.get("/financial-years")
async def list_financial_years(user: CurrentUser) -> dict:
    del user
    return _service.financial_years()


@router.get("/states")
async def list_states(user: CurrentUser, db: DB) -> dict:
    del user
    return {"items": await _service.states(db)}


@router.get("/districts")
async def list_districts(
    user: CurrentUser,
    db: DB,
    state_code: str = Query(..., min_length=1, max_length=8),
) -> dict:
    del user
    return {"items": await _service.districts(db, state_code=state_code)}


@router.get("/cities")
async def list_cities(
    user: CurrentUser,
    db: DB,
    state_code: str = Query(..., min_length=1, max_length=8),
    district_code: str = Query(..., min_length=1, max_length=16),
) -> dict:
    del user
    return await _service.cities(db, state_code=state_code, district_code=district_code)


@router.get("/blocks")
async def list_blocks(
    user: CurrentUser,
    db: DB,
    state_code: str = Query(..., min_length=1, max_length=8),
    district_code: str = Query(..., min_length=1, max_length=16),
) -> dict:
    del user
    return await _service.blocks(db, state_code=state_code, district_code=district_code)


@router.get("/gram-panchayats")
async def list_gram_panchayats(
    user: CurrentUser,
    db: DB,
    block_lgd: int = Query(..., ge=1),
) -> dict:
    del user
    return await _service.gram_panchayats(db, block_lgd=block_lgd)


@router.get("/villages")
async def list_villages(
    user: CurrentUser,
    db: DB,
    gram_panchayat_code: str = Query(..., min_length=1, max_length=32),
) -> dict:
    del user
    return await _service.villages(db, gram_panchayat_code=gram_panchayat_code)
