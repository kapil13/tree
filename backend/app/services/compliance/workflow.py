"""Guided compliance readiness workflow for planting projects."""

from __future__ import annotations

from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.compliance.evaluator import build_auto_signals, list_project_checklist_summaries
from app.services.planting_projects.survival_survey import survey_interval_days

WorkflowStepStatus = Literal["done", "partial", "pending", "skipped"]

SEGMENT_RECOMMENDED_CHECKLIST: dict[str, str] = {
    "nhai_highway": "ngt_campa",
    "industrial_greenbelt": "verra_vm0047",
    "ngo_watershed": "gold_standard_luf",
    "township_landscape": "esg_general",
    "general": "esg_general",
}

SEGMENT_CHECKLIST_LABEL: dict[str, str] = {
    "ngt_campa": "NGT / CAMPA",
    "verra_vm0047": "Verra VM0047",
    "gold_standard_luf": "Gold Standard LUF",
    "esg_general": "ESG disclosure",
    "redd_plus": "REDD+",
}


def _step_status(signal: str | None, *, optional: bool = False) -> WorkflowStepStatus:
    if signal == "yes":
        return "done"
    if signal == "partial":
        return "partial"
    if optional and signal in (None, "na"):
        return "skipped"
    return "pending"


async def _project_metrics(db: AsyncSession, project: PlantingProject) -> dict[str, int]:
    from app.models.plantation_fence import PlantationFence

    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    tree_count = len(trees)
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    satellite_verified = sum(1 for t in trees if t.satellite_verified)

    open_violations_res = await db.execute(
        select(PlantingComplianceViolation).where(
            PlantingComplianceViolation.project_id == project.id,
            PlantingComplianceViolation.resolved_at.is_(None),
        )
    )
    open_violations = list(open_violations_res.scalars().all())
    blocking = sum(1 for v in open_violations if v.severity == "block")

    work_area_count = int(
        (
            await db.execute(
                select(func.count()).where(PlantationFence.project_id == project.id)
            )
        ).scalar_one()
        or 0
    )

    return {
        "tree_count": tree_count,
        "geo_tagged_count": geo_tagged,
        "satellite_verified_count": satellite_verified,
        "open_violations": len(open_violations),
        "blocking_violations": blocking,
        "work_area_count": work_area_count,
    }


async def build_compliance_workflow(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    """Return step-by-step compliance readiness for a planting project."""
    metrics = await _project_metrics(db, project)
    signals = await build_auto_signals(db, project)
    checklist_summaries = await list_project_checklist_summaries(db, project)
    recommended_code = SEGMENT_RECOMMENDED_CHECKLIST.get(project.segment, "esg_general")
    recommended = next(
        (c for c in checklist_summaries if c["code"] == recommended_code),
        checklist_summaries[0] if checklist_summaries else None,
    )

    interval = survey_interval_days(project)
    meta = project.metadata_ or {}
    survey_saved = meta.get("survey_interval_days") in (15, 30)

    tree_count = metrics["tree_count"]
    geo_tagged_count = metrics["geo_tagged_count"]
    satellite_verified_count = metrics["satellite_verified_count"]
    open_violations = metrics["open_violations"]
    blocking_violations = metrics["blocking_violations"]
    work_area_count = metrics["work_area_count"]

    geo_pct = round(100 * geo_tagged_count / tree_count, 1) if tree_count else 0.0
    sat_pct = round(100 * satellite_verified_count / tree_count, 1) if tree_count else 0.0

    checklist_done = False
    checklist_partial = False
    if recommended:
        status = recommended.get("eligibility_status", "not_started")
        completion = float(recommended.get("completion_pct") or 0)
        checklist_done = status in ("eligible", "gaps_identified") and completion >= 100
        checklist_partial = completion > 0 or status == "in_progress"

    credit_optional = project.segment == "nhai_highway" or recommended_code == "ngt_campa"

    steps: list[dict[str, Any]] = [
        {
            "id": "planting_standard",
            "title": "Attach planting standard",
            "description": "Link the segment template (NHAI, ESG green belt, NGO watershed, etc.) so field rules apply.",
            "status": _step_status(signals.get("active_standard_attached")),
            "action_label": "Review standard",
            "action_tab": "overview",
            "metric": None,
            "optional": False,
        },
        {
            "id": "work_areas",
            "title": "Map work areas",
            "description": "Draw corridor or polygon boundaries so trees are scoped and compliance checks run.",
            "status": _step_status(signals.get("has_work_areas")),
            "action_label": "Open overview map",
            "action_tab": "overview",
            "metric": f"{work_area_count} area{'s' if work_area_count != 1 else ''}" if work_area_count else None,
            "optional": project.segment == "general",
        },
        {
            "id": "survey_cadence",
            "title": "Configure survival survey cadence",
            "description": f"Set re-geotag / survival reminders (currently {interval} days). Saves to project metadata for checklist auto-checks.",
            "status": "done" if survey_saved else "partial" if interval in (15, 30) else "pending",
            "action_label": "Save in settings",
            "action_tab": "settings",
            "metric": f"{interval}-day interval" + (" · saved" if survey_saved else " · not saved"),
            "optional": False,
            "quick_fix": None if survey_saved else {"survey_interval_days": interval},
        },
        {
            "id": "register_trees",
            "title": "Register trees in the field",
            "description": "Tag trees with GPS, photos, and metadata (pit size, guard, native species where required).",
            "status": _step_status(signals.get("has_trees")),
            "action_label": "Register tree",
            "action_tab": "trees",
            "action_href": f"/trees/new?project={project.id}",
            "metric": f"{tree_count} registered" if tree_count else None,
            "optional": False,
        },
        {
            "id": "geo_coverage",
            "title": "Re-geotag ≥80% of trees",
            "description": "Survival surveys with fresh GPS power geo-tag checklist items across all frameworks.",
            "status": _step_status(signals.get("geo_tagged_majority")),
            "action_label": "Review trees",
            "action_tab": "trees",
            "metric": f"{geo_tagged_count}/{tree_count} geotagged ({geo_pct}%)" if tree_count else None,
            "optional": False,
        },
        {
            "id": "satellite_monitoring",
            "title": "Run satellite verification",
            "description": "NDVI checks corroborate canopy presence — especially for REDD+ and ESG reports.",
            "status": _step_status(signals.get("satellite_coverage"), optional=True),
            "action_label": "Open satellite view",
            "action_tab": "overview",
            "action_href": "/satellite",
            "metric": f"{satellite_verified_count}/{tree_count} verified ({sat_pct}%)" if tree_count else None,
            "optional": True,
        },
        {
            "id": "resolve_violations",
            "title": "Clear blocking violations",
            "description": "Fix pit size, spacing, guard, chainage, or native-species issues flagged during registration.",
            "status": _step_status(signals.get("no_block_violations")),
            "action_label": "View violations",
            "action_tab": "compliance",
            "action_anchor": "violations",
            "metric": (
                f"{blocking_violations} blocking · {open_violations} open"
                if open_violations
                else "None open"
            ),
            "optional": False,
        },
        {
            "id": "sync_credits",
            "title": "Sync credit ledger",
            "description": "Recompute VM0047 / Gold Standard carbon strata for Verra and ESG checklist auto-checks.",
            "status": _step_status(
                signals.get("credit_ledger_synced"),
                optional=credit_optional,
            ),
            "action_label": "Open credits tab",
            "action_tab": "credits",
            "metric": None,
            "optional": credit_optional,
        },
        {
            "id": "review_checklist",
            "title": f"Complete {SEGMENT_CHECKLIST_LABEL.get(recommended_code, 'framework')} checklist",
            "description": "Review auto-suggested answers, fill manual eligibility items, and save.",
            "status": (
                "done"
                if checklist_done
                else "partial"
                if checklist_partial
                else "pending"
            ),
            "action_label": "Open checklist",
            "action_tab": "compliance",
            "action_anchor": "checklist",
            "metric": (
                f"{recommended['completion_pct']:.0f}% complete · {recommended['eligibility_status'].replace('_', ' ')}"
                if recommended
                else None
            ),
            "optional": False,
            "recommended_checklist": recommended_code,
        },
    ]

    required_steps = [s for s in steps if not s.get("optional")]
    done_count = sum(1 for s in required_steps if s["status"] == "done")
    partial_count = sum(1 for s in required_steps if s["status"] == "partial")

    return {
        "project_id": str(project.id),
        "segment": project.segment,
        "compliance_mode": project.compliance_mode,
        "recommended_checklist": recommended_code,
        "recommended_checklist_label": SEGMENT_CHECKLIST_LABEL.get(recommended_code, recommended_code),
        "steps": steps,
        "progress": {
            "done": done_count,
            "partial": partial_count,
            "total": len(required_steps),
            "pct": round(100 * done_count / len(required_steps), 1) if required_steps else 0,
        },
        "auto_signals": signals,
        "checklist_summaries": checklist_summaries,
    }
