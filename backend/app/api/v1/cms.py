"""Platform CMS API — public read + admin write."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CmsManager
from app.models.cms import CmsPage, CmsSection, CmsSiteConfig
from app.schemas.cms import (
    CmsPageCreate,
    CmsPageUpdate,
    CmsSectionCreate,
    CmsSectionUpdate,
    SiteConfigUpdate,
)
from app.services.audit import record_audit
from app.services.cms.defaults import SECTION_TYPES
from app.services.cms.service import (
    _page_dict,
    _section_dict,
    ensure_cms_seeded,
    get_page_admin,
    get_public_page,
    get_site_config,
    list_pages_admin,
    slugify,
)

public_router = APIRouter(prefix="/public", tags=["public"])
admin_router = APIRouter(prefix="/platform/cms", tags=["platform-cms"])


@public_router.get("/site")
async def public_site_home(db: DB) -> dict:
    """Published homepage + header/footer for marketing site."""
    try:
        return await get_public_page(db)
    except ValueError as exc:
        if str(exc) == "page_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc) from exc
        raise


@public_router.get("/pages/{slug}")
async def public_site_page(slug: str, db: DB) -> dict:
    try:
        return await get_public_page(db, slug=slug)
    except ValueError as exc:
        if str(exc) == "page_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc) from exc
        raise


@admin_router.get("/section-types")
async def cms_section_types(_manager: CmsManager) -> list[str]:
    return list(SECTION_TYPES)


@admin_router.get("/site")
async def cms_get_site(_manager: CmsManager, db: DB) -> dict:
    return await get_site_config(db)


@admin_router.put("/site/{config_key}")
async def cms_update_site(
    config_key: str,
    payload: SiteConfigUpdate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    if config_key not in ("header", "footer"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_config_key")

    await ensure_cms_seeded(db)
    row = (
        await db.execute(select(CmsSiteConfig).where(CmsSiteConfig.config_key == config_key))
    ).scalar_one_or_none()
    if row is None:
        row = CmsSiteConfig(config_key=config_key, data=payload.data)
        db.add(row)
    else:
        row.data = payload.data
    row.updated_by_user_id = manager.id

    await record_audit(
        db,
        actor=manager,
        action="cms.site.update",
        resource_type="cms_site_config",
        resource_id=row.id,
        request=request,
        diff={"config_key": config_key},
    )
    await db.commit()
    return {config_key: row.data}


@admin_router.get("/pages")
async def cms_list_pages(_manager: CmsManager, db: DB) -> list[dict]:
    return await list_pages_admin(db)


@admin_router.post("/pages")
async def cms_create_page(
    payload: CmsPageCreate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    await ensure_cms_seeded(db)
    slug = slugify(payload.slug or payload.title)
    existing = (await db.execute(select(CmsPage).where(CmsPage.slug == slug))).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="slug_exists")

    if payload.is_home:
        for page in (await db.execute(select(CmsPage).where(CmsPage.is_home.is_(True)))).scalars():
            page.is_home = False

    page = CmsPage(
        slug=slug,
        title=payload.title.strip(),
        meta_description=payload.meta_description,
        published=payload.published,
        is_home=payload.is_home,
        sort_order=payload.sort_order,
    )
    db.add(page)
    await db.flush()

    await record_audit(
        db,
        actor=manager,
        action="cms.page.create",
        resource_type="cms_page",
        resource_id=page.id,
        request=request,
        diff={"slug": slug, "title": page.title},
    )
    await db.commit()
    loaded = await get_page_admin(db, page.id)
    assert loaded is not None
    return _page_dict(loaded)


@admin_router.get("/pages/{page_id}")
async def cms_get_page(page_id: uuid.UUID, _manager: CmsManager, db: DB) -> dict:
    page = await get_page_admin(db, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="page_not_found")
    sections = [_section_dict(s) for s in sorted(page.sections, key=lambda x: x.sort_order)]
    return {**_page_dict(page, include_sections=False), "sections": sections}


@admin_router.patch("/pages/{page_id}")
async def cms_update_page(
    page_id: uuid.UUID,
    payload: CmsPageUpdate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    page = await get_page_admin(db, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="page_not_found")

    if payload.title is not None:
        page.title = payload.title.strip()
    if payload.slug is not None:
        new_slug = slugify(payload.slug)
        clash = (
            await db.execute(select(CmsPage).where(CmsPage.slug == new_slug, CmsPage.id != page_id))
        ).scalar_one_or_none()
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="slug_exists")
        page.slug = new_slug
    if payload.meta_description is not None:
        page.meta_description = payload.meta_description
    if payload.published is not None:
        page.published = payload.published
    if payload.sort_order is not None:
        page.sort_order = payload.sort_order
    if payload.is_home is True:
        for other in (await db.execute(select(CmsPage).where(CmsPage.is_home.is_(True)))).scalars():
            other.is_home = False
        page.is_home = True
    elif payload.is_home is False:
        page.is_home = False

    await record_audit(
        db,
        actor=manager,
        action="cms.page.update",
        resource_type="cms_page",
        resource_id=page.id,
        request=request,
        diff={"slug": page.slug},
    )
    await db.commit()
    loaded = await get_page_admin(db, page.id)
    assert loaded is not None
    return _page_dict(loaded)


@admin_router.delete("/pages/{page_id}")
async def cms_delete_page(
    page_id: uuid.UUID,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    page = await get_page_admin(db, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="page_not_found")
    if page.is_home:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="cannot_delete_home_page")

    await record_audit(
        db,
        actor=manager,
        action="cms.page.delete",
        resource_type="cms_page",
        resource_id=page.id,
        request=request,
        diff={"slug": page.slug},
    )
    await db.delete(page)
    await db.commit()
    return {"status": "deleted"}


@admin_router.post("/pages/{page_id}/sections")
async def cms_create_section(
    page_id: uuid.UUID,
    payload: CmsSectionCreate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    page = await get_page_admin(db, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="page_not_found")
    if payload.section_type not in SECTION_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_section_type")

    section = CmsSection(
        page_id=page.id,
        section_type=payload.section_type,
        anchor_id=payload.anchor_id,
        title=payload.title,
        content=payload.content,
        sort_order=payload.sort_order,
        enabled=payload.enabled,
    )
    db.add(section)
    await db.flush()

    await record_audit(
        db,
        actor=manager,
        action="cms.section.create",
        resource_type="cms_section",
        resource_id=section.id,
        request=request,
        diff={"page_id": str(page.id), "section_type": section.section_type},
    )
    await db.commit()
    return _section_dict(section)


@admin_router.patch("/sections/{section_id}")
async def cms_update_section(
    section_id: uuid.UUID,
    payload: CmsSectionUpdate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    section = await db.get(CmsSection, section_id)
    if section is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="section_not_found")

    if payload.section_type is not None:
        if payload.section_type not in SECTION_TYPES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_section_type")
        section.section_type = payload.section_type
    if payload.anchor_id is not None:
        section.anchor_id = payload.anchor_id or None
    if payload.title is not None:
        section.title = payload.title
    if payload.content is not None:
        section.content = payload.content
    if payload.sort_order is not None:
        section.sort_order = payload.sort_order
    if payload.enabled is not None:
        section.enabled = payload.enabled

    await record_audit(
        db,
        actor=manager,
        action="cms.section.update",
        resource_type="cms_section",
        resource_id=section.id,
        request=request,
        diff={"section_type": section.section_type},
    )
    await db.commit()
    return _section_dict(section)


@admin_router.delete("/sections/{section_id}")
async def cms_delete_section(
    section_id: uuid.UUID,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    section = await db.get(CmsSection, section_id)
    if section is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="section_not_found")

    await record_audit(
        db,
        actor=manager,
        action="cms.section.delete",
        resource_type="cms_section",
        resource_id=section.id,
        request=request,
        diff={"page_id": str(section.page_id)},
    )
    await db.delete(section)
    await db.commit()
    return {"status": "deleted"}
