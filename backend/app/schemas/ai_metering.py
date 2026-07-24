from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AiScanMeterStatusOut(BaseModel):
    tier: Literal["byot_metered", "professional_unlimited", "platform_admin"]
    complimentary_limit: int = Field(ge=0)
    complimentary_used: int = Field(ge=0)
    purchased_balance: int = Field(ge=0)
    remaining_complimentary: int = Field(ge=0)
    remaining_total: int | None = Field(
        default=None,
        description="Null means unlimited (professional/admin tiers).",
    )
    can_scan: bool
    requires_payment: bool
    payment_enabled: bool = False
