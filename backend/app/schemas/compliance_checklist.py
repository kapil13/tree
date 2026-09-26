"""Compliance checklist schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ChecklistAnswer = Literal["yes", "no", "partial", "na"]


class ChecklistItemAnswer(BaseModel):
    answer: ChecklistAnswer | None = None
    notes: str | None = Field(default=None, max_length=2000)


class ChecklistSaveRequest(BaseModel):
    answers: dict[str, ChecklistItemAnswer] = Field(default_factory=dict)
