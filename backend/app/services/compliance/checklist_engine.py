"""CMS checklist rule engine — merge item overrides onto code-defined checklists."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance_checklist_override import ComplianceChecklistOverride
from app.services.compliance.checklists import get_checklist, list_checklists


async def get_checklist_override_row(
    db: AsyncSession, checklist_code: str
) -> ComplianceChecklistOverride | None:
    res = await db.execute(
        select(ComplianceChecklistOverride).where(
            ComplianceChecklistOverride.checklist_code == checklist_code
        )
    )
    return res.scalar_one_or_none()


def merge_checklist_items(
    base_items: tuple[Any, ...],
    item_overrides: dict[str, Any],
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    for item in base_items:
        row = {
            "id": item.id,
            "category": item.category,
            "question": item.question,
            "guidance": item.guidance,
            "required": item.required,
            "auto_key": item.auto_key,
        }
        override = item_overrides.get(item.id)
        if override:
            if override.get("question"):
                row["question"] = override["question"]
            if override.get("guidance"):
                row["guidance"] = override["guidance"]
            if "required" in override:
                row["required"] = bool(override["required"])
        merged.append(row)
    return merged


async def get_effective_checklist(db: AsyncSession, code: str) -> dict[str, Any] | None:
    base = get_checklist(code)
    if base is None:
        return None

    catalog = {
        "code": base.code,
        "title": base.title,
        "short_label": base.short_label,
        "framework_reference": base.framework_reference,
        "description": base.description,
        "disclaimer": base.disclaimer,
        "item_count": len(base.items),
    }

    row = await get_checklist_override_row(db, code)
    items = merge_checklist_items(base.items, row.item_overrides if row and row.enabled else {})
    return {
        **catalog,
        "has_custom_items": bool(row and row.enabled and row.item_overrides),
        "override": {
            "enabled": row.enabled if row else False,
            "item_overrides": row.item_overrides if row else {},
            "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
        },
        "items": items,
    }


async def list_effective_checklists(db: AsyncSession) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for entry in list_checklists():
        effective = await get_effective_checklist(db, entry["code"])
        if effective:
            out.append(effective)
    return out


def validate_checklist_override(item_overrides: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(item_overrides, dict):
        return ["item_overrides must be an object keyed by checklist item id."]
    for item_id, patch in item_overrides.items():
        if not isinstance(patch, dict):
            errors.append(f"Override for '{item_id}' must be an object.")
            continue
        if "question" in patch and not str(patch["question"]).strip():
            errors.append(f"Item '{item_id}' question cannot be empty.")
    return errors


def checklist_admin_summary(
    *,
    code: str,
    effective: dict[str, Any],
    code_items: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "checklist_code": code,
        **{k: effective[k] for k in ("title", "short_label", "framework_reference", "description", "disclaimer") if k in effective},
        "has_custom_items": effective.get("has_custom_items", False),
        "item_count": len(code_items),
        "override": effective.get("override", {}),
        "code_items": code_items,
        "effective_items": effective.get("items", []),
    }
