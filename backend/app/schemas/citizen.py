from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CitizenBadgeOut(BaseModel):
    id: str
    label: str
    description: str
    earned_at: str | None = None


class CitizenProfileOut(BaseModel):
    user_id: uuid.UUID
    points: int
    badges: list[dict[str, Any]]
    stewardship_streak: int
    last_stewardship_at: datetime | None = None
    onboarding_steps: list[str]
    trees_owned: int
    trees_adopted: int
    badge_catalog: list[dict[str, Any]]


class StewardshipTreeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_code: str
    species_text: str | None = None
    relationship: str
    owner_name: str | None = None
    nickname: str | None = None
    current_health: str
    survival_status: str | None = None
    registered_at: datetime
    last_geotag_at: datetime | None = None
    stewardship_checkins: int = 0
    days_since_planted: int | None = None
    next_checkin_due: bool = False
    adopted_at: datetime | None = None


class StewardshipSummaryOut(BaseModel):
    owned: list[StewardshipTreeOut]
    adopted: list[StewardshipTreeOut]
    due_count: int
    due_tree_ids: list[str]


class AdoptTreeRequest(BaseModel):
    nickname: str | None = Field(default=None, max_length=128)


class AdoptByCodeRequest(BaseModel):
    public_code: str = Field(..., min_length=6, max_length=64)
    nickname: str | None = Field(default=None, max_length=128)


class GamificationEventOut(BaseModel):
    points: int
    stewardship_streak: int | None = None
    new_badges: list[dict[str, Any]] = Field(default_factory=list)


class CitizenFastSignupStartRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=10, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    captcha_token: str | None = None


class CitizenFastSignupCompleteRequest(BaseModel):
    signup_token: str
    code: str = Field(min_length=4, max_length=8)
