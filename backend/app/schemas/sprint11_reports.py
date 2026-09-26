"""Export request schemas for Sprint 11–12 reports."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class FrameworkExportRequest(BaseModel):
    project_id: uuid.UUID | None = None
    format: Literal["json", "xlsx", "zip"] = Field(default="zip")


class DarwinExportRequest(BaseModel):
    project_id: uuid.UUID
    format: Literal["json", "zip"] = Field(default="zip")
