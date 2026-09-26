from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SiteVisitCreate(BaseModel):
    visitor_id: str = Field(..., min_length=8, max_length=36)
    path: str = Field(default="/", max_length=512)
    locale: str | None = Field(default=None, max_length=8)


class SiteVisitStatsOut(BaseModel):
    total: int
    today: int
    unique_today: int


class SiteVisitRecordedOut(BaseModel):
    recorded: bool


class PlatformSiteVisitOut(BaseModel):
    id: str
    visitor_id: str
    path: str
    ip: str | None
    user_agent: str | None
    referrer: str | None
    locale: str | None
    created_at: datetime
