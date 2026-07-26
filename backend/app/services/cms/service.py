"""CMS seed and query helpers."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.models.cms import CmsPage, CmsSection, CmsSiteConfig
from app.services.cms.defaults import (
    FOOTER_DEFAULT,
    HEADER_DEFAULT,
    HOME_PAGE_DEFAULT,
    HOME_SECTIONS_DEFAULT,
)
from app.services.cms.legal import LEGAL_PAGE_SLUGS, LEGAL_PAGES_DEFAULT


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:120] or "page"


async def ensure_legal_pages(db: AsyncSession) -> None:
    """Idempotently create Terms / Privacy / Data Use CMS pages for admin editing."""
    for page_def in LEGAL_PAGES_DEFAULT:
        existing = (
            await db.execute(select(CmsPage).where(CmsPage.slug == page_def["slug"]))
        ).scalar_one_or_none()
        if existing is not None:
            continue
        page = CmsPage(
            slug=page_def["slug"],
            title=page_def["title"],
            meta_description=page_def["meta_description"],
            published=True,
            is_home=False,
            sort_order=page_def["sort_order"],
        )
        db.add(page)
        await db.flush()
        db.add(
            CmsSection(
                page_id=page.id,
                section_type="rich_text",
                anchor_id=None,
                title=page_def["title"],
                content={"body": page_def["body"], "html": ""},
                sort_order=0,
                enabled=True,
            )
        )


async def _ensure_footer_legal_links(db: AsyncSession) -> None:
    row = (
        await db.execute(select(CmsSiteConfig).where(CmsSiteConfig.config_key == "footer"))
    ).scalar_one_or_none()
    if row is None:
        return
    data = dict(row.data or {})
    columns = list(data.get("columns") or [])
    has_terms = False
    for col in columns:
        for link in col.get("links") or []:
            if str(link.get("href", "")).rstrip("/") in {"/terms", "/privacy", "/data-use"}:
                has_terms = True
                break
    if has_terms:
        return
    columns.append(
        {
            "title": "Legal",
            "links": [
                {"label": "Terms of Service", "href": "/terms"},
                {"label": "Privacy Policy", "href": "/privacy"},
                {"label": "Data Use Policy", "href": "/data-use"},
            ],
        }
    )
    data["columns"] = columns
    if not data.get("legal_note"):
        data["legal_note"] = FOOTER_DEFAULT.get("legal_note")
    row.data = data
    flag_modified(row, "data")


async def ensure_cms_seeded(db: AsyncSession) -> None:
    existing = (await db.execute(select(CmsPage).limit(1))).scalar_one_or_none()
    if existing is None:
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

    await ensure_legal_pages(db)
    await _ensure_footer_legal_links(db)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()


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


async def get_page_admin_by_slug(db: AsyncSession, slug: str) -> CmsPage | None:
    await ensure_cms_seeded(db)
    res = await db.execute(
        select(CmsPage).options(selectinload(CmsPage.sections)).where(CmsPage.slug == slug)
    )
    return res.scalar_one_or_none()


async def resolve_page_admin(db: AsyncSession, page_ref: str) -> CmsPage | None:
    try:
        page_id = uuid.UUID(page_ref)
    except ValueError:
        return await get_page_admin_by_slug(db, page_ref)
    page = await get_page_admin(db, page_id)
    if page is not None:
        return page
    return await get_page_admin_by_slug(db, page_ref)


def _legal_body_from_page(page: CmsPage) -> str:
    sections = sorted(page.sections, key=lambda s: s.sort_order)
    for section in sections:
        if section.section_type != "rich_text":
            continue
        content = section.content or {}
        body = content.get("body")
        if body:
            return str(body)
        html = content.get("html")
        if html:
            return str(html)
    return ""


async def list_legal_documents(db: AsyncSession) -> list[dict[str, Any]]:
    await ensure_cms_seeded(db)
    docs: list[dict[str, Any]] = []
    for slug in LEGAL_PAGE_SLUGS:
        page = await get_page_admin_by_slug(db, slug)
        if page is None:
            continue
        docs.append(
            {
                "slug": page.slug,
                "title": page.title,
                "meta_description": page.meta_description,
                "published": page.published,
                "public_path": f"/{page.slug}",
                "updated_at": page.updated_at.isoformat() if page.updated_at else None,
                "body": _legal_body_from_page(page),
                "page_id": str(page.id),
            }
        )
    return docs


async def update_legal_document(
    db: AsyncSession,
    slug: str,
    *,
    title: str | None = None,
    meta_description: str | None = None,
    body: str | None = None,
    published: bool | None = None,
    actor_user_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    if slug not in LEGAL_PAGE_SLUGS:
        raise ValueError("unknown_legal_slug")
    await ensure_cms_seeded(db)
    page = await get_page_admin_by_slug(db, slug)
    if page is None:
        raise ValueError("page_not_found")

    if title is not None:
        page.title = title.strip() or page.title
    if meta_description is not None:
        page.meta_description = meta_description
    if published is not None:
        page.published = published
    page.updated_by_user_id = actor_user_id

    if body is not None:
        rich = next((s for s in page.sections if s.section_type == "rich_text"), None)
        if rich is None:
            rich = CmsSection(
                page_id=page.id,
                section_type="rich_text",
                title=page.title,
                content={"body": body, "html": ""},
                sort_order=0,
                enabled=True,
            )
            db.add(rich)
        else:
            rich.content = {**(rich.content or {}), "body": body, "html": ""}
            if hasattr(rich, "_sa_instance_state"):
                flag_modified(rich, "content")
            rich.title = page.title
            rich.enabled = True

    await db.flush()
    await db.refresh(page)
    # reload sections
    page = await get_page_admin_by_slug(db, slug)
    assert page is not None
    return {
        "slug": page.slug,
        "title": page.title,
        "meta_description": page.meta_description,
        "published": page.published,
        "public_path": f"/{page.slug}",
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
        "body": _legal_body_from_page(page),
        "page_id": str(page.id),
    }
