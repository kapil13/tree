from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScanPackOut(BaseModel):
    sku: str
    label: str
    description: str
    credits: int
    amount_paise: int
    amount_inr: float
    currency: str


class PaymentCatalogOut(BaseModel):
    items: list[ScanPackOut]
    payments_enabled: bool
    razorpay_key_id: str | None = None


class PaymentOrderCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=64)


class PaymentOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sku: str
    credits_granted: int
    amount_paise: int
    currency: str
    razorpay_order_id: str
    status: str
    paid_at: datetime | None = None
    created_at: datetime


class PaymentCheckoutOut(BaseModel):
    order: PaymentOrderOut
    razorpay_key_id: str
    amount_paise: int
    currency: str
    credits: int
    label: str


class PaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
