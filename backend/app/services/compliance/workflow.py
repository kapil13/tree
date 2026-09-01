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
from app.services.schemes.compliance import checklists_for_project
from app.services.schemes.monitoring import is_monitoring_scheme, is_satellite_watch_enabled

WorkflowStepStatus = Literal["done", "partial", "pending", "skipped"]

SEGMENT_RECOMMENDED_CHECKLIST: dict[str, str] = {
    "nhai_highway": "ngt_campa",
    "industrial_greenbelt": "verra_vm0047",
    "ngo_watershed": "gold_standard_luf",
    "township_landscape": "esg_general",
    "nagar_van_urban": "nagar_van_urban",
    "sahakar_van_coop": "sahakar_van_coop",
    "general": "esg_general",
    "estate_monitoring": "estate_monitoring",
}

SEGMENT_CHECKLIST_LABEL: dict[str, str] = {
    "ngt_campa": "NGT / CAMPA",
    "verra_vm0047": "Verra VM0047",
    "gold_standard_luf": "Gold Standard LUF",
    "esg_general": "ESG disclosure",
    "redd_plus": "REDD+",
    "gim_general": "Green India Mission",
    "mishti_coastal": "MISHTI",
    "mgnrega_convergence": "MGNREGA",
    "nagar_van_urban": "Nagar Van",
    "sahakar_van_coop": "Sahakar Van",
    "green_credit_india": "Green Credit",
    "icvcm_ccp": "ICVCM CCPs",
    "fra_tenure": "FRA / Tenure",
    "article6_readiness": "Article 6",
    "world_bank_esf": "World Bank ESF",
    "undp_ses": "UNDP SES",
    "estate_monitoring": "Estate monitoring",
}


def _project_compliance_href(project_id: str, section: str | None = None) -> str:
    base = f"/projects/{project_id}/compliance"
    return f"{base}?section={section}" if section else base


def _project_tab_href(project_id: str, tab: str) -> str:
    return f"/projects/{project_id}/{tab}"


def _project_setup_href(project_id: str, step: int) -> str:
    return f"/projects/{project_id}/setup?step={step}"


def _portfolio_monitoring_href(project_id: str | None = None) -> str:
    if project_id:
        return f"/portfolio-health?tab=monitoring&project={project_id}"
    return "/portfolio-health?tab=monitoring"


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


async def _build_monitoring_compliance_workflow(
    db: AsyncSession, project: PlantingProject
) -> dict[str, Any]:
    """Estate watch readiness workflow — satellite-first, no tree census."""
    metrics = await _project_metrics(db, project)
    signals = await build_auto_signals(db, project)
    checklist_summaries = await list_project_checklist_summaries(db, project)
    scheme_checklists = checklists_for_project(project)
    recommended_code = (
        scheme_checklists[0]
        if scheme_checklists
        else SEGMENT_RECOMMENDED_CHECKLIST.get(project.segment, "estate_monitoring")
    )
    recommended = next(
        (c for c in checklist_summaries if c["code"] == recommended_code),
        checklist_summaries[0] if checklist_summaries else None,
    )

    work_area_count = metrics["work_area_count"]
    open_violations = metrics["open_violations"]
    blocking_violations = metrics["blocking_violations"]

    checklist_done = False
    checklist_partial = False
    if recommended:
        status = recommended.get("eligibility_status", "not_started")
        completion = float(recommended.get("completion_pct") or 0)
        checklist_done = status in ("eligible", "gaps_identified") and completion >= 100
        checklist_partial = completion > 0 or status == "in_progress"

    scan_signal = signals.get("work_area_scan_coverage")
    scan_metric = None
    if work_area_count > 0 and scan_signal:
        scan_metric = {
            "yes": "All blocks scanned within cadence",
            "partial": "Some blocks need a fresh NDVI scan",
            "no": "Run initial NDVI scan on all blocks",
        }.get(scan_signal)

    sar_signal = signals.get("sar_permanence_risk")
    sar_metric = {
        "yes": "SAR integrity active",
        "partial": "At-risk blocks need review",
        "no": "Awaiting SAR integrity scores",
    }.get(sar_signal or "no", None)

    project_id = str(project.id)
    satellite_href = f"/satellite?project={project_id}"

    steps: list[dict[str, Any]] = [
        {
            "id": "estate_details",
            "title": "Record estate details",
            "description": "Estate name, managing agency, forest type, baseline year, and monitoring objective.",
            "status": _step_status(signals.get("estate_metadata_complete")),
            "action_label": "Open setup wizard",
            "action_tab": "overview",
            "action_href": f"/projects/{project_id}/setup?step=3",
            "metric": None,
            "optional": False,
        },
        {
            "id": "monitoring_standard",
            "title": "Attach monitoring standard",
            "description": "Link the estate monitoring template so scan cadence and block-size rules apply.",
            "status": _step_status(signals.get("active_standard_attached")),
            "action_label": "Open setup wizard",
            "action_tab": "overview",
            "action_href": f"/projects/{project_id}/setup?step=2",
            "metric": None,
            "optional": False,
        },
        {
            "id": "work_areas",
            "title": "Draw estate work areas",
            "description": "Map 10–500 ha block polygons for NDVI and SAR scans.",
            "status": _step_status(signals.get("has_work_areas")),
            "action_label": "Draw work areas",
            "action_tab": "overview",
            "action_href": f"/projects/{project_id}/setup?step=4",
            "metric": (
                f"{work_area_count} block{'s' if work_area_count != 1 else ''}"
                if work_area_count
                else None
            ),
            "optional": False,
        },
        {
            "id": "initial_satellite_scan",
            "title": "Run initial NDVI scan",
            "description": "Establish a canopy baseline on every work-area polygon (target ≥80% coverage).",
            "status": _step_status(signals.get("work_area_scan_coverage")),
            "action_label": "Open satellite monitoring",
            "action_tab": "overview",
            "action_href": satellite_href,
            "metric": scan_metric,
            "optional": False,
        },
        {
            "id": "sar_integrity",
            "title": "Review SAR forest integrity",
            "description": "Weekly SAR alerts flag encroachment and moisture stress alongside monthly NDVI.",
            "status": _step_status(signals.get("sar_permanence_risk"), optional=True),
            "action_label": "Review integrity",
            "action_tab": "overview",
            "action_href": satellite_href,
            "metric": sar_metric,
            "optional": True,
        },
        {
            "id": "resolve_violations",
            "title": "Clear blocking violations",
            "description": "Resolve boundary or data-quality issues before external reporting.",
            "status": _step_status(signals.get("no_block_violations")),
            "action_label": "View violations",
            "action_tab": "compliance",
            "action_anchor": "violations",
            "action_href": _project_compliance_href(project_id, "issues"),
            "metric": (
                f"{blocking_violations} blocking · {open_violations} open"
                if open_violations
                else "None open"
            ),
            "optional": False,
        },
        {
            "id": "review_checklist",
            "title": "Complete estate monitoring checklist",
            "description": "Review auto-suggested answers, confirm alert review process, and save.",
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
            "action_href": _project_compliance_href(project_id, "checklist"),
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
        "project_id": project_id,
        "segment": project.segment,
        "compliance_mode": project.compliance_mode,
        "monitoring_mode": True,
        "recommended_checklist": recommended_code,
        "recommended_checklist_label": SEGMENT_CHECKLIST_LABEL.get(
            recommended_code, recommended_code
        ),
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


async def build_compliance_workflow(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    """Return step-by-step compliance readiness for a planting project."""
    if is_monitoring_scheme(getattr(project, "scheme_code", None)):
        return await _build_monitoring_compliance_workflow(db, project)

    metrics = await _project_metrics(db, project)
    signals = await build_auto_signals(db, project)
    checklist_summaries = await list_project_checklist_summaries(db, project)
    scheme_checklists = checklists_for_project(project)
    recommended_code = (
        scheme_checklists[0]
        if scheme_checklists
        else SEGMENT_RECOMMENDED_CHECKLIST.get(project.segment, "esg_general")
    )
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
    project_id = str(project.id)

    steps: list[dict[str, Any]] = [
        {
            "id": "planting_standard",
            "title": "Attach planting standard",
            "description": "Link the segment template (NHAI, ESG green belt, NGO watershed, etc.) so field rules apply.",
            "status": _step_status(signals.get("active_standard_attached")),
            "action_label": "Review standard",
            "action_tab": "overview",
            "action_href": _project_setup_href(str(project.id), 2),
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
            "action_href": _project_setup_href(str(project.id), 4),
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
            "action_href": _project_tab_href(str(project.id), "settings"),
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
            "action_href": f"/projects/{project.id}",
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
            "action_href": _portfolio_monitoring_href(str(project.id)),
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
            "action_href": _project_compliance_href(project_id, "issues"),
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
            "action_href": _project_tab_href(str(project.id), "credits"),
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
            "action_href": _project_compliance_href(project_id, "checklist"),
            "metric": (
                f"{recommended['completion_pct']:.0f}% complete · {recommended['eligibility_status'].replace('_', ' ')}"
                if recommended
                else None
            ),
            "optional": False,
            "recommended_checklist": recommended_code,
        },
    ]

    if is_satellite_watch_enabled(project):
        project_id = str(project.id)
        scan_signal = signals.get("work_area_scan_coverage")
        for step in steps:
            if step["id"] == "satellite_monitoring":
                step["title"] = "Run NDVI scan on work areas"
                step["description"] = (
                    "Monthly NDVI on work-area polygons tracks canopy health alongside field work."
                )
                step["status"] = _step_status(scan_signal)
                step["action_label"] = "Open satellite monitoring"
                step["action_href"] = f"/satellite?project={project_id}"
                step["optional"] = False
                step["metric"] = {
                    "yes": "All blocks scanned within cadence",
                    "partial": "Some blocks need a fresh NDVI scan",
                    "no": "Run initial NDVI scan on all blocks",
                }.get(scan_signal or "no")
                break

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
        "satellite_watch": is_satellite_watch_enabled(project),
    }
