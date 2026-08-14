"""BRSR export request schema."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class BrsrExportRequest(BaseModel):
    project_id: uuid.UUID | None = None
    format: Literal["json", "xlsx", "zip"] = Field(
        default="zip",
        description="json | xlsx | zip (JSON + Excel assurance pack)",
    )
