"""ISO 14064-2 export request schema."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class Iso14064ExportRequest(BaseModel):
    project_id: uuid.UUID
    format: Literal["json", "xlsx", "zip"] = Field(default="zip")
