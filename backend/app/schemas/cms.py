"""CMS API schemas."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class SiteConfigUpdate(BaseModel):
    data: dict[str, Any]


class CmsPageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=120)
    meta_description: str = ""
    published: bool = True
    is_home: bool = False
    sort_order: int = 0


class CmsPageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=120)
    meta_description: str | None = None
    published: bool | None = None
    is_home: bool | None = None
    sort_order: int | None = None


class CmsSectionCreate(BaseModel):
    section_type: str = Field(min_length=2, max_length=64)
    anchor_id: str | None = Field(default=None, max_length=64)
    title: str = ""
    content: dict[str, Any] = Field(default_factory=dict)
    sort_order: int = 0
    enabled: bool = True


class CmsSectionUpdate(BaseModel):
    section_type: str | None = Field(default=None, min_length=2, max_length=64)
    anchor_id: str | None = Field(default=None, max_length=64)
    title: str | None = None
    content: dict[str, Any] | None = None
    sort_order: int | None = None
    enabled: bool | None = None


class CmsSectionOut(BaseModel):
    id: uuid.UUID
    section_type: str
    anchor_id: str | None
    title: str
    content: dict[str, Any]
    sort_order: int
    enabled: bool
