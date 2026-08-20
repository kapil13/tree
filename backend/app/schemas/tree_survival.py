from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TreeSurvivalEventCreate(BaseModel):
    status: str = Field(..., pattern="^(alive|dead|removed|stressed|unknown)$")
    cause: str | None = Field(default=None, max_length=128)
    evidence_key: str | None = Field(default=None, max_length=512)
    event_at: datetime | None = None


class TreeSurvivalEventOut(BaseModel):
    id: UUID
    tree_id: UUID
    event_at: datetime
    status: str
    cause: str | None
    evidence_key: str | None
    recorded_by_id: UUID | None

    model_config = {"from_attributes": True}
