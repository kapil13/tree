"""BYOT AI scan usage and metering status."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.deps import DB, CurrentUser
from app.schemas.ai_metering import AiScanMeterStatusOut
from app.services.ai.metering import get_ai_scan_meter_status

router = APIRouter(prefix="/ai-scans", tags=["ai-scans"])


@router.get("/usage", response_model=AiScanMeterStatusOut)
async def ai_scan_usage(user: CurrentUser, db: DB) -> AiScanMeterStatusOut:
    return AiScanMeterStatusOut.model_validate(
        (await get_ai_scan_meter_status(db, user)).as_dict()
    )
