"""CMS models for marketing site content (platform admin)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class CmsSiteConfig(UUIDPKMixin, TimestampMixin, Base):
    """Global site fragments — header, footer, SEO defaults."""

    __tablename__ = "cms_site_config"

    config_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )


class CmsPage(UUIDPKMixin, TimestampMixin, Base):
    """Marketing or content page."""

    __tablename__ = "cms_pages"

    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    meta_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_home: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    sections = relationship(
        "CmsSection",
        back_populates="page",
        cascade="all, delete-orphan",
        order_by="CmsSection.sort_order",
    )

    __table_args__ = (Index("cms_pages_published_idx", "published"),)


class CmsSection(UUIDPKMixin, TimestampMixin, Base):
    """Ordered content block on a CMS page."""

    __tablename__ = "cms_sections"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_pages.id", ondelete="CASCADE"), nullable=False
    )
    section_type: Mapped[str] = mapped_column(String(64), nullable=False)
    anchor_id: Mapped[str | None] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    page = relationship("CmsPage", back_populates="sections")

    __table_args__ = (
        Index("cms_sections_page_order_idx", "page_id", "sort_order"),
        UniqueConstraint("page_id", "anchor_id", name="cms_sections_page_anchor_uq"),
    )
