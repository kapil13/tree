"""BYOT AI scan pack catalog (Razorpay one-time purchases)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScanPackSku:
    sku: str
    label: str
    description: str
    credits: int
    amount_paise: int
    currency: str = "INR"


SCAN_PACK_CATALOG: dict[str, ScanPackSku] = {
    "byot_ai_5": ScanPackSku(
        sku="byot_ai_5",
        label="5 AI scans",
        description="Five additional BYOT tree AI analyses after your complimentary allowance.",
        credits=5,
        amount_paise=9900,
    ),
    "byot_ai_20": ScanPackSku(
        sku="byot_ai_20",
        label="20 AI scans",
        description="Best value — twenty BYOT tree AI analyses.",
        credits=20,
        amount_paise=29900,
    ),
}


def get_scan_pack(sku: str) -> ScanPackSku | None:
    return SCAN_PACK_CATALOG.get(sku)


def list_scan_packs() -> list[ScanPackSku]:
    return list(SCAN_PACK_CATALOG.values())
