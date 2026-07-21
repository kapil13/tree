"""CMS seed and query helpers."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cms import CmsPage, CmsSection, CmsSiteConfig
from app.services.cms.defaults import (
    FOOTER_DEFAULT,
    HEADER_DEFAULT,
    HOME_PAGE_DEFAULT,
    HOME_SECTIONS_DEFAULT,
)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:120] or "page"


async def ensure_cms_seeded(db: AsyncSession) -> None:
    existing = (await db.execute(select(CmsPage).limit(1))).scalar_one_or_none()
    if existing is not None:
        return

    for key, data in (("header", HEADER_DEFAULT), ("footer", FOOTER_DEFAULT)):
        db.add(CmsSiteConfig(config_key=key, data=data))

    page = CmsPage(**HOME_PAGE_DEFAULT)
    db.add(page)
    await db.flush()

    for section_def in HOME_SECTIONS_DEFAULT:
        db.add(
            CmsSection(
                page_id=page.id,
                section_type=section_def["section_type"],
                anchor_id=section_def.get("anchor_id"),
                title=section_def["title"],
                content=section_def["content"],
                sort_order=section_def["sort_order"],
                enabled=True,
            )
        )
    await db.flush()


async def get_site_config(db: AsyncSession) -> dict[str, Any]:
    await ensure_cms_seeded(db)
    rows = (await db.execute(select(CmsSiteConfig))).scalars().all()
    by_key = {row.config_key: row.data for row in rows}
    return {
        "header": by_key.get("header", HEADER_DEFAULT),
        "footer": by_key.get("footer", FOOTER_DEFAULT),
    }


def _section_dict(section: CmsSection) -> dict[str, Any]:
    return {
        "id": str(section.id),
        "section_type": section.section_type,
        "anchor_id": section.anchor_id,
        "title": section.title,
        "content": section.content,
        "sort_order": section.sort_order,
        "enabled": section.enabled,
    }


def _page_dict(page: CmsPage, *, include_sections: bool = True) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": str(page.id),
        "slug": page.slug,
        "title": page.title,
        "meta_description": page.meta_description,
        "published": page.published,
        "is_home": page.is_home,
        "sort_order": page.sort_order,
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
    }
    if include_sections:
        payload["sections"] = [
            _section_dict(s) for s in sorted(page.sections, key=lambda x: x.sort_order) if s.enabled
        ]
    return payload


async def get_public_page(db: AsyncSession, slug: str | None = None) -> dict[str, Any]:
    await ensure_cms_seeded(db)
    site = await get_site_config(db)

    stmt = select(CmsPage).options(selectinload(CmsPage.sections))
    if slug in (None, "", "home"):
        stmt = stmt.where(CmsPage.is_home.is_(True))
    else:
        stmt = stmt.where(CmsPage.slug == slug, CmsPage.published.is_(True))

    page = (await db.execute(stmt)).scalar_one_or_none()
    if page is None:
        raise ValueError("page_not_found")

    return {"site": site, "page": _page_dict(page)}


async def list_pages_admin(db: AsyncSession) -> list[dict[str, Any]]:
    await ensure_cms_seeded(db)
    pages = (
        await db.execute(select(CmsPage).order_by(CmsPage.sort_order, CmsPage.title))
    ).scalars().all()
    return [_page_dict(p, include_sections=False) for p in pages]


async def get_page_admin(db: AsyncSession, page_id: uuid.UUID) -> CmsPage | None:
    await ensure_cms_seeded(db)
    res = await db.execute(
        select(CmsPage).options(selectinload(CmsPage.sections)).where(CmsPage.id == page_id)
    )
    return res.scalar_one_or_none()
