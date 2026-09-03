"""Shared integrity recalculation after tree lifecycle events."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.integrity.tree_risk import apply_integrity_to_tree, recalculate_tree_integrity
from app.services.planting_projects.rule_engine import get_effective_rules, resolve_compliance_mode
from app.services.planting_projects.service import get_active_standard


async def _load_tree_for_integrity(db: AsyncSession, tree_id: uuid.UUID) -> Tree | None:
    res = await db.execute(
        select(Tree)
        .where(Tree.id == tree_id)
        .options(
            selectinload(Tree.images),
            selectinload(Tree.planting_program),
            selectinload(Tree.risk_score),
        )
    )
    return res.scalar_one_or_none()


async def refresh_tree_integrity(
    db: AsyncSession,
    tree: Tree,
    *,
    overall_confidence: float | None = None,
) -> None:
    loaded = await _load_tree_for_integrity(db, tree.id)
    if loaded is not None:
        tree = loaded
    program_code = tree.planting_program.code if tree.planting_program else "byot"
    compliance_mode = "open"
    rules_max_acc = None
    if tree.project_id:
        project = await db.get(PlantingProject, tree.project_id)
        if project:
            standard = await get_active_standard(db, project)
            rules = await get_effective_rules(db, standard, project_id=project.id)
            compliance_mode = await resolve_compliance_mode(
                db,
                template_code=standard.template_code if standard else project.standard_template_code,
                project_compliance_mode=project.compliance_mode,
                project_id=project.id,
            )
            if rules.get("max_gps_accuracy_m") is not None:
                rules_max_acc = float(rules["max_gps_accuracy_m"])
    assessment = await recalculate_tree_integrity(
        db,
        tree,
        compliance_mode=compliance_mode,  # type: ignore[arg-type]
        program_code=program_code,
        rules_max_accuracy_m=rules_max_acc,
        overall_confidence=overall_confidence,
    )
    await apply_integrity_to_tree(
        db,
        tree,
        assessment,
        strict_photo_evidence=compliance_mode == "strict",
    )
