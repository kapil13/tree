"""Validate work areas against project planting template rules."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.services.planting_projects.rule_engine import get_effective_rules
from app.services.planting_projects.service import get_active_standard


def _validate_area_bounds(rules: dict[str, Any], area_ha: float) -> None:
    site_area = rules.get("site_area_ha")
    if not isinstance(site_area, dict):
        return
    min_ha = site_area.get("min")
    max_ha = site_area.get("max")
    if min_ha is not None and area_ha < float(min_ha):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"work_area_too_small:{area_ha:.4f}ha",
        )
    if max_ha is not None and area_ha > float(max_ha):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"work_area_too_large:{area_ha:.4f}ha",
        )


def _validate_block_type(rules: dict[str, Any], segment_code: str | None) -> None:
    block_types = rules.get("block_types")
    if not block_types:
        return
    if not segment_code:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="block_type_required",
        )
    if segment_code not in block_types:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"invalid_block_type:{segment_code}",
        )


def _validate_declared_site_area(project: PlantingProject, area_ha: float) -> None:
    refs = (project.metadata_ or {}).get("scheme_refs") or {}
    declared = refs.get("site_area_ha")
    if declared is None:
        return
    try:
        declared_ha = float(declared)
    except (TypeError, ValueError):
        return
    tolerance = max(declared_ha * 0.2, 0.02)
    if abs(area_ha - declared_ha) > tolerance:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"work_area_site_area_mismatch:{area_ha:.4f}ha_vs_{declared_ha:.4f}ha",
        )


async def validate_work_area(
    db: AsyncSession,
    project: PlantingProject,
    *,
    area_ha: float,
    segment_code: str | None,
) -> None:
    """Raise HTTP 422 when a work area violates effective planting template rules."""
    standard = await get_active_standard(db, project)
    rules = await get_effective_rules(db, standard, project_id=project.id)
    if not rules:
        return

    _validate_area_bounds(rules, area_ha)
    _validate_block_type(rules, segment_code)
    _validate_declared_site_area(project, area_ha)
