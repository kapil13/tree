"""Webhook API schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class WebhookCreate(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    url: HttpUrl
    events: list[str] = Field(min_length=1, max_length=20)


class WebhookUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    url: HttpUrl | None = None
    events: list[str] | None = Field(default=None, min_length=1, max_length=20)
    enabled: bool | None = None


class WebhookOut(BaseModel):
    id: uuid.UUID
    label: str
    url: str
    events: list[str]
    enabled: bool
    signing_secret_preview: str
    created_at: datetime
    updated_at: datetime


class WebhookCreatedOut(WebhookOut):
    signing_secret: str


class WebhookDeliveryOut(BaseModel):
    id: uuid.UUID
    webhook_id: uuid.UUID
    event_type: str
    status: str
    attempt_count: int
    response_status: int | None
    error_message: str | None
    delivered_at: datetime | None
    created_at: datetime
    payload: dict[str, Any]
