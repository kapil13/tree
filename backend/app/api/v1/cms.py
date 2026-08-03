"""Platform CMS API — public read + admin write."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from app.api.v1.deps import DB, CmsManager
from app.models.cms import CmsPage, CmsSection, CmsSiteConfig
from app.models.compliance_checklist_override import ComplianceChecklistOverride
from app.models.planting_custom_template import PlantingCustomTemplate
from app.models.planting_rule_template import PlantingRuleTemplateOverride
from app.models.planting_rule_template_version import PlantingRuleTemplateVersion
from app.schemas.cms import (
    CmsPageCreate,
    CmsPageUpdate,
    CmsSectionCreate,
    CmsSectionUpdate,
    LegalDocumentUpdate,
    SiteConfigUpdate,
)
from app.schemas.rule_template import (
    ChecklistOverrideUpdate,
    RuleTemplateAdminOut,
    RuleTemplateCreate,
    RuleTemplateImportBundle,
    RuleTemplateOverrideUpdate,
    RuleTemplatePreviewRequest,
)
from app.services.audit import record_audit
from app.services.cms.defaults import SECTION_TYPES
from app.services.cms.legal import LEGAL_PAGE_SLUGS
from app.services.cms.service import (
    _page_dict,
    _section_dict,
    ensure_cms_seeded,
    get_page_admin,
    get_public_page,
    get_site_config,
    list_legal_documents,
    list_pages_admin,
    resolve_page_admin,
    slugify,
    update_legal_document,
)
from app.services.compliance.checklist_engine import (
    get_effective_checklist,
    list_effective_checklists,
    validate_checklist_override,
)
from app.services.compliance.checklists import get_checklist
from app.services.planting_projects.compliance import evaluate_tree_placement
from app.services.planting_projects.rule_engine import (
    VALID_TEMPLATE_SEGMENTS,
    bootstrap_rules_from_clone,
    build_rule_template_admin_entry,
    build_scheme_template_map,
    ensure_unique_template_code,
    export_templates_bundle,
    get_custom_template_row,
    get_effective_template,
    get_template_override_row,
    is_admin_editable_template,
    is_custom_template_code,
    list_all_template_codes,
    list_custom_templates,
    list_editable_template_codes,
    list_template_versions,
    merge_rules,
    record_template_version,
    rule_template_admin_dict,
    sanitize_custom_rules,
    sanitize_override_rules,
    slugify_template_code,
    validate_rule_override,
    version_to_dict,
)
from app.services.planting_projects.templates import get_template

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


@admin_router.get("/legal")
async def cms_list_legal(_manager: CmsManager, db: DB) -> list[dict]:
    """Terms, Privacy, and Data Use documents for admin editing."""
    return await list_legal_documents(db)


@admin_router.put("/legal/{slug}")
async def cms_update_legal(
    slug: str,
    payload: LegalDocumentUpdate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    try:
        doc = await update_legal_document(
            db,
            slug,
            title=payload.title,
            meta_description=payload.meta_description,
            body=payload.body,
            published=payload.published,
            actor_user_id=manager.id,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "unknown_legal_slug":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code == "page_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        raise

    await record_audit(
        db,
        actor=manager,
        action="cms.legal.update",
        resource_type="cms_page",
        resource_id=uuid.UUID(doc["page_id"]),
        request=request,
        diff={"slug": slug, "title": doc["title"]},
    )
    await db.commit()
    return doc


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


@admin_router.get("/pages/{page_ref}")
async def cms_get_page(page_ref: str, _manager: CmsManager, db: DB) -> dict:
    page = await resolve_page_admin(db, page_ref)
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
    if page.slug in LEGAL_PAGE_SLUGS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="cannot_delete_legal_page",
        )

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


@admin_router.get("/rule-templates", response_model=list[RuleTemplateAdminOut])
async def cms_list_rule_templates(_manager: CmsManager, db: DB) -> list[dict]:
    """List built-in and CMS-created planting rule templates."""
    items: list[dict] = []
    for code in await list_all_template_codes(db):
        entry = await build_rule_template_admin_entry(db, code)
        if entry:
            items.append(entry)
    return items


@admin_router.post("/rule-templates", response_model=RuleTemplateAdminOut, status_code=status.HTTP_201_CREATED)
async def cms_create_rule_template(
    payload: RuleTemplateCreate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    if payload.segment not in VALID_TEMPLATE_SEGMENTS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"validation_errors": [f"segment must be one of: {', '.join(sorted(VALID_TEMPLATE_SEGMENTS))}"]},
        )
    if payload.clone_from and not is_admin_editable_template(payload.clone_from):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="clone_from template not found")

    rules = payload.rules if payload.rules is not None else bootstrap_rules_from_clone(payload.clone_from)
    cleaned_rules = sanitize_custom_rules(rules)
    errors = validate_rule_override(cleaned_rules)
    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"validation_errors": errors})

    base_code = slugify_template_code(payload.name)
    template_code = await ensure_unique_template_code(db, base_code)

    row = PlantingCustomTemplate(
        template_code=template_code,
        name=payload.name.strip(),
        segment=payload.segment,
        description=payload.description.strip(),
        compliance_mode=payload.compliance_mode,
        recommended_program_codes=list(payload.recommended_program_codes or []),
        rules=cleaned_rules,
        clone_source_code=payload.clone_from,
        created_by_user_id=manager.id,
        updated_by_user_id=manager.id,
    )
    db.add(row)
    await db.flush()

    await record_template_version(
        db,
        template_code=template_code,
        rules=cleaned_rules,
        compliance_mode=payload.compliance_mode,
        enabled=True,
        effective_from=None,
        publish_note=f"Created custom template: {payload.name.strip()}",
        actor_user_id=manager.id,
    )

    await record_audit(
        db,
        actor=manager,
        action="cms.rule_template.create",
        resource_type="planting_custom_template",
        resource_id=row.id,
        request=request,
        diff={"template_code": template_code, "name": row.name},
    )
    await db.commit()
    await db.refresh(row)

    entry = await build_rule_template_admin_entry(db, template_code)
    if entry is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="template_create_failed")
    return entry


@admin_router.get("/rule-templates/export")
async def cms_export_rule_templates(_manager: CmsManager, db: DB) -> dict:
    rows = {
        code: await get_template_override_row(db, code) for code in list_editable_template_codes()
    }
    bundle = export_templates_bundle(rows)
    custom_entries: list[dict[str, Any]] = []
    for row in await list_custom_templates(db):
        custom_entries.append(
            {
                "template_code": row.template_code,
                "name": row.name,
                "segment": row.segment,
                "description": row.description,
                "compliance_mode": row.compliance_mode,
                "recommended_program_codes": row.recommended_program_codes,
                "rules": row.rules,
                "clone_source_code": row.clone_source_code,
            }
        )
    bundle["custom_templates"] = custom_entries
    return bundle


@admin_router.post("/rule-templates/import")
async def cms_import_rule_templates(
    payload: RuleTemplateImportBundle,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    imported = 0
    for entry in payload.templates:
        code = entry.get("template_code")
        if not code or not is_admin_editable_template(code):
            continue
        base = get_template(code)
        if base is None:
            continue
        override_payload = entry.get("override") or {}
        rules = sanitize_override_rules(base["rules"], override_payload.get("rules") or {})
        errors = validate_rule_override(rules)
        if errors:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"validation_errors": errors, "template_code": code},
            )
        row = await get_template_override_row(db, code)
        if row is None:
            row = PlantingRuleTemplateOverride(template_code=code, rules={}, enabled=True)
            db.add(row)
        row.rules = rules
        row.enabled = bool(override_payload.get("enabled", True))
        row.compliance_mode = override_payload.get("compliance_mode")
        row.publish_note = override_payload.get("publish_note")
        row.updated_by_user_id = manager.id
        await record_template_version(
            db,
            template_code=code,
            rules=rules,
            compliance_mode=row.compliance_mode,
            enabled=row.enabled,
            effective_from=None,
            publish_note=row.publish_note or "Imported via CMS bundle",
            actor_user_id=manager.id,
        )
        imported += 1

    await record_audit(
        db,
        actor=manager,
        action="cms.rule_template.import",
        resource_type="planting_rule_template_override",
        resource_id=None,
        request=request,
        diff={"imported_count": imported},
    )
    await db.commit()
    return {"imported": imported}


@admin_router.get("/rule-schemes-map")
async def cms_rule_schemes_map(_manager: CmsManager) -> list[dict]:
    return build_scheme_template_map()


@admin_router.get("/rule-templates/{template_code}", response_model=RuleTemplateAdminOut)
async def cms_get_rule_template(
    template_code: str, _manager: CmsManager, db: DB
) -> dict:
    if not is_admin_editable_template(template_code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_editable")
    entry = await build_rule_template_admin_entry(db, template_code)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")
    return entry


@admin_router.put("/rule-templates/{template_code}", response_model=RuleTemplateAdminOut)
async def cms_update_rule_template(
    template_code: str,
    payload: RuleTemplateOverrideUpdate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    if not is_admin_editable_template(template_code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_editable")

    if is_custom_template_code(template_code):
        custom = await get_custom_template_row(db, template_code)
        if custom is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")

        cleaned_rules = sanitize_custom_rules(payload.rules)
        errors = validate_rule_override(cleaned_rules)
        if errors:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"validation_errors": errors},
            )

        if payload.name is not None:
            custom.name = payload.name.strip()
        if payload.description is not None:
            custom.description = payload.description.strip()
        if payload.segment is not None:
            if payload.segment not in VALID_TEMPLATE_SEGMENTS:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"validation_errors": ["segment is invalid"]},
                )
            custom.segment = payload.segment
        if payload.recommended_program_codes is not None:
            custom.recommended_program_codes = list(payload.recommended_program_codes)
        if payload.compliance_mode is not None:
            custom.compliance_mode = payload.compliance_mode
        custom.rules = cleaned_rules
        custom.updated_by_user_id = manager.id
        await db.flush()

        await record_template_version(
            db,
            template_code=template_code,
            rules=cleaned_rules,
            compliance_mode=custom.compliance_mode,
            enabled=True,
            effective_from=None,
            publish_note=payload.publish_note or "Updated custom template",
            actor_user_id=manager.id,
        )

        await record_audit(
            db,
            actor=manager,
            action="cms.rule_template.update",
            resource_type="planting_custom_template",
            resource_id=custom.id,
            request=request,
            diff={"template_code": template_code},
        )
        await db.commit()
        await db.refresh(custom)

        entry = await build_rule_template_admin_entry(db, template_code)
        if entry is None:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="template_update_failed")
        return entry

    base = get_template(template_code)
    if base is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")

    errors = validate_rule_override(payload.rules)
    if errors:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"validation_errors": errors},
        )

    cleaned_rules = sanitize_override_rules(base["rules"], payload.rules)

    row = await get_template_override_row(db, template_code)
    if row is None:
        row = PlantingRuleTemplateOverride(template_code=template_code, rules={}, enabled=True)
        db.add(row)
    row.rules = cleaned_rules
    row.enabled = payload.enabled
    row.compliance_mode = payload.compliance_mode
    row.effective_from = payload.effective_from
    row.publish_note = payload.publish_note
    row.updated_by_user_id = manager.id
    await db.flush()

    await record_template_version(
        db,
        template_code=template_code,
        rules=cleaned_rules,
        compliance_mode=payload.compliance_mode,
        enabled=payload.enabled,
        effective_from=payload.effective_from,
        publish_note=payload.publish_note,
        actor_user_id=manager.id,
    )

    await record_audit(
        db,
        actor=manager,
        action="cms.rule_template.update",
        resource_type="planting_rule_template_override",
        resource_id=row.id,
        request=request,
        diff={"template_code": template_code, "enabled": payload.enabled},
    )
    await db.commit()

    entry = await build_rule_template_admin_entry(db, template_code)
    if entry is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="template_update_failed")
    return entry


@admin_router.delete("/rule-templates/{template_code}", status_code=status.HTTP_204_NO_CONTENT)
async def cms_archive_rule_template(
    template_code: str,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> Response:
    if not is_custom_template_code(template_code):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="builtin_template_not_deletable")
    custom = await get_custom_template_row(db, template_code)
    if custom is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")
    custom.archived = True
    custom.updated_by_user_id = manager.id
    await record_audit(
        db,
        actor=manager,
        action="cms.rule_template.archive",
        resource_type="planting_custom_template",
        resource_id=custom.id,
        request=request,
        diff={"template_code": template_code},
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get("/rule-templates/{template_code}/versions")
async def cms_list_rule_template_versions(
    template_code: str, _manager: CmsManager, db: DB
) -> list[dict]:
    if not is_admin_editable_template(template_code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_editable")
    versions = await list_template_versions(db, template_code)
    return [version_to_dict(v) for v in versions]


@admin_router.post("/rule-templates/{template_code}/versions/{version_id}/rollback")
async def cms_rollback_rule_template(
    template_code: str,
    version_id: uuid.UUID,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    if not is_admin_editable_template(template_code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_editable")

    version = await db.get(PlantingRuleTemplateVersion, version_id)
    if version is None or version.template_code != template_code:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="version_not_found")

    if is_custom_template_code(template_code):
        custom = await get_custom_template_row(db, template_code)
        if custom is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")
        custom.rules = version.rules
        if version.compliance_mode:
            custom.compliance_mode = version.compliance_mode
        custom.updated_by_user_id = manager.id
        await db.flush()

        await record_template_version(
            db,
            template_code=template_code,
            rules=version.rules,
            compliance_mode=version.compliance_mode,
            enabled=True,
            effective_from=None,
            publish_note=f"Rollback to v{version.version_number}",
            actor_user_id=manager.id,
            is_rollback=True,
        )

        await record_audit(
            db,
            actor=manager,
            action="cms.rule_template.rollback",
            resource_type="planting_custom_template",
            resource_id=custom.id,
            request=request,
            diff={"template_code": template_code, "version_id": str(version_id)},
        )
        await db.commit()

        entry = await build_rule_template_admin_entry(db, template_code)
        if entry is None:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="rollback_failed")
        return entry

    base = get_template(template_code)
    if base is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")

    row = await get_template_override_row(db, template_code)
    if row is None:
        row = PlantingRuleTemplateOverride(template_code=template_code, rules={}, enabled=True)
        db.add(row)
    row.rules = version.rules
    row.enabled = version.enabled
    row.compliance_mode = version.compliance_mode
    row.effective_from = None
    row.publish_note = f"Rollback to v{version.version_number}"
    row.updated_by_user_id = manager.id
    await db.flush()

    await record_template_version(
        db,
        template_code=template_code,
        rules=version.rules,
        compliance_mode=version.compliance_mode,
        enabled=version.enabled,
        effective_from=None,
        publish_note=row.publish_note,
        actor_user_id=manager.id,
        is_rollback=True,
    )

    effective_tpl = await get_effective_template(db, template_code)
    effective_rules = dict(effective_tpl["rules"]) if effective_tpl else dict(base["rules"])

    await record_audit(
        db,
        actor=manager,
        action="cms.rule_template.rollback",
        resource_type="planting_rule_template_override",
        resource_id=row.id,
        request=request,
        diff={"template_code": template_code, "version_id": str(version_id)},
    )
    await db.commit()
    await db.refresh(row)

    return rule_template_admin_dict(
        code=template_code,
        base=base,
        override=row,
        effective_rules=effective_rules,
        effective_compliance_mode=effective_tpl["compliance_mode"] if effective_tpl else None,
    )


@admin_router.post("/rule-templates/{template_code}/preview")
async def cms_preview_rule_template(
    template_code: str,
    payload: RuleTemplatePreviewRequest,
    _manager: CmsManager,
    db: DB,
) -> dict:
    if not is_admin_editable_template(template_code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_editable")

    base_tpl = await get_effective_template(db, template_code)
    if base_tpl is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found")

    if is_custom_template_code(template_code):
        rules = sanitize_custom_rules(payload.rules)
    else:
        base = get_template(template_code)
        assert base is not None
        rules = merge_rules(base["rules"], sanitize_override_rules(base["rules"], payload.rules))
    result = await evaluate_tree_placement(
        db,
        project=None,
        work_area=None,
        rules=rules,
        compliance_mode=payload.compliance_mode,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy_m=payload.accuracy_m,
        species_text=payload.species_text,
        photo_count=payload.photo_count,
        metadata=payload.metadata,
    )
    return {
        "template_code": template_code,
        "compliance_mode": payload.compliance_mode,
        "rules_preview": rules,
        "result": result.to_dict(),
    }


@admin_router.get("/checklist-overrides")
async def cms_list_checklist_overrides(_manager: CmsManager, db: DB) -> list[dict]:
    items = await list_effective_checklists(db)
    return [
        {
            "checklist_code": item["code"],
            "title": item["title"],
            "short_label": item["short_label"],
            "framework_reference": item["framework_reference"],
            "has_custom_items": item.get("has_custom_items", False),
            "item_count": item.get("item_count", 0),
            "override": item.get("override", {}),
        }
        for item in items
    ]


@admin_router.get("/checklist-overrides/{checklist_code}")
async def cms_get_checklist_override(
    checklist_code: str, _manager: CmsManager, db: DB
) -> dict:
    effective = await get_effective_checklist(db, checklist_code)
    if effective is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="checklist_not_found")
    base = get_checklist(checklist_code)
    code_items = [
        {
            "id": item.id,
            "category": item.category,
            "question": item.question,
            "guidance": item.guidance,
            "required": item.required,
        }
        for item in (base.items if base else [])
    ]
    return {
        "checklist_code": checklist_code,
        "title": effective["title"],
        "short_label": effective["short_label"],
        "framework_reference": effective["framework_reference"],
        "description": effective["description"],
        "disclaimer": effective["disclaimer"],
        "has_custom_items": effective.get("has_custom_items", False),
        "code_items": code_items,
        "effective_items": effective.get("items", []),
        "override": effective.get("override", {}),
    }


@admin_router.put("/checklist-overrides/{checklist_code}")
async def cms_update_checklist_override(
    checklist_code: str,
    payload: ChecklistOverrideUpdate,
    request: Request,
    manager: CmsManager,
    db: DB,
) -> dict:
    if get_checklist(checklist_code) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="checklist_not_found")

    errors = validate_checklist_override(payload.item_overrides)
    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"validation_errors": errors})

    row = (
        await db.execute(
            select(ComplianceChecklistOverride).where(
                ComplianceChecklistOverride.checklist_code == checklist_code
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = ComplianceChecklistOverride(checklist_code=checklist_code, item_overrides={})
        db.add(row)
    row.item_overrides = payload.item_overrides
    row.enabled = payload.enabled
    row.updated_by_user_id = manager.id

    await record_audit(
        db,
        actor=manager,
        action="cms.checklist_override.update",
        resource_type="compliance_checklist_override",
        resource_id=row.id,
        request=request,
        diff={"checklist_code": checklist_code},
    )
    await db.commit()

    effective = await get_effective_checklist(db, checklist_code)
    assert effective is not None
    return await cms_get_checklist_override(checklist_code, manager, db)


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
