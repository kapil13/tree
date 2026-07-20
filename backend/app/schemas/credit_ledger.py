"""Credit ledger schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CreditStatus = Literal["estimated", "verified", "buffered", "issued"]
MethodologyCode = Literal["IPCC_AR6", "VERRA_VM0047", "GOLD_STANDARD_LUF"]


class CreditLedgerTransition(BaseModel):
    to_status: CreditStatus
    notes: str | None = Field(default=None, max_length=2000)
    registry_reference: str | None = Field(default=None, max_length=255)


class CreditLedgerSyncRequest(BaseModel):
    methodology: MethodologyCode = "VERRA_VM0047"
