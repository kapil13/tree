"""PMCP / FMCP progressive closure milestones and EC green-belt compliance."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_ledger import ProjectCreditLedger
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.planting_projects.rule_engine import get_effective_rules
from app.services.planting_projects.service import get_active_standard
from app.services.schemes.kpis import scan_coverage_metrics

EC_GREEN_BELT_PCT_DEFAULT = 33.0

GREEN_BELT_BLOCK_TYPES = frozenset(
    {
        "green_belt_strip",
        "buffer_zone",
        "highway_corridor",
        "median_strip",
        "service_road",
        "farm_forestry_strip",
        "riverbank_strip",
        "floodplain_buffer",
    }
)

CLOSURE_PHASE_ORDER = (
    "phase_i_dump_stabilization",
    "phase_ii_greenbelt",
    "phase_iii_ecorestoration",
    "final_closure",
)

CLOSURE_PHASE_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "code": "phase_i_dump_stabilization",
        "label": "Phase I — dump stabilization",
        "order": 1,
        "typical_months_from_plan": 0,
        "deliverables": (
            "ibm_closure_plan_ref",
            "mine_lease_number",
            "work_areas_drawn",
            "satellite_baseline",
        ),
    },
    {
        "code": "phase_ii_greenbelt",
        "label": "Phase II — green belt",
        "order": 2,
        "typical_months_from_plan": 12,
        "deliverables": (
            "ec_green_belt_met",
            "native_stocking_met",
            "trees_registered",
            "satellite_mrv_active",
        ),
    },
    {
        "code": "phase_iii_ecorestoration",
        "label": "Phase III — eco-restoration",
        "order": 3,
        "typical_months_from_plan": 36,
        "deliverables": (
            "survival_survey_active",
            "satellite_mrv_active",
            "no_block_violations",
        ),
    },
    {
        "code": "final_closure",
        "label": "Final mine closure (FMCP)",
        "order": 4,
        "typical_months_from_plan": 60,
        "deliverables": (
            "fmcp_documented",
            "ec_green_belt_met",
            "satellite_mrv_active",
            "credit_ledger_synced",
        ),
    },
)


def _scheme_refs(project: PlantingProject) -> dict[str, Any]:
    return (project.metadata_ or {}).get("scheme_refs") or {}


def _closure_tracking_enabled(project: PlantingProject, rules: dict[str, Any]) -> bool:
    if project.scheme_code == "mining_reclamation":
        return True
    return bool(rules.get("progressive_closure_tracking"))


def _green_belt_pct_target(rules: dict[str, Any]) -> float:
    raw = rules.get("ec_green_belt_pct_min")
    if raw is None:
        return EC_GREEN_BELT_PCT_DEFAULT
    return float(raw)


def _fence_block_type(fence: PlantationFence) -> str | None:
    meta = fence.metadata_ or {}
    return meta.get("block_type") or meta.get("reclamation_block_type") or fence.segment_code


def _green_belt_area_ha(fences: list[PlantationFence], *, project_block_type: str | None) -> float:
    if not fences:
        return 0.0
    total = 0.0
    for fence in fences:
        block = _fence_block_type(fence) or project_block_type
        if block is None or block in GREEN_BELT_BLOCK_TYPES:
            total += float(fence.area_ha or 0)
    return round(total, 4)


def _native_species_pct(trees: list[Tree]) -> float:
    if not trees:
        return 0.0
    native = 0
    for tree in trees:
        meta = tree.metadata_ or {}
        if meta.get("is_native") in (True, "true", "yes", 1):
            native += 1
            continue
        category = str(meta.get("species_category", "")).lower()
        if category in ("native", "indigenous"):
            native += 1
    return round(100 * native / len(trees), 1)


async def compute_green_belt_compliance(
    db: AsyncSession,
    project: PlantingProject,
    *,
    rules: dict[str, Any] | None = None,
    fences: list[PlantationFence] | None = None,
) -> dict[str, Any]:
    refs = _scheme_refs(project)
    lease_area_ha = refs.get("lease_area_ha")
    if lease_area_ha is None:
        return {
            "applicable": False,
            "status": "not_applicable",
            "reason": "lease_area_ha_not_recorded",
        }

    try:
        lease_ha = float(lease_area_ha)
    except (TypeError, ValueError):
        return {
            "applicable": False,
            "status": "not_applicable",
            "reason": "invalid_lease_area_ha",
        }

    if lease_ha <= 0:
        return {
            "applicable": False,
            "status": "not_applicable",
            "reason": "invalid_lease_area_ha",
        }

    if fences is None:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id == project.id)
                )
            ).scalars().all()
        )

    if rules is None:
        standard = await get_active_standard(db, project)
        rules = (
            await get_effective_rules(db, standard, project_id=project.id)
            if standard is not None
            else {}
        )

    pct_target = _green_belt_pct_target(rules)
    required_ha = round(lease_ha * pct_target / 100, 4)
    planted_ha = _green_belt_area_ha(
        fences, project_block_type=refs.get("reclamation_block_type")
    )
    coverage_pct = round(100 * planted_ha / required_ha, 1) if required_ha > 0 else 0.0

    if planted_ha >= required_ha:
        status = "compliant"
    elif planted_ha > 0:
        status = "partial"
    else:
        status = "non_compliant"

    return {
        "applicable": True,
        "status": status,
        "ec_green_belt_pct_required": pct_target,
        "lease_area_ha": lease_ha,
        "required_green_belt_ha": required_ha,
        "mapped_green_belt_ha": planted_ha,
        "coverage_pct": coverage_pct,
        "shortfall_ha": round(max(required_ha - planted_ha, 0), 4),
    }


async def _has_satellite_baseline(db: AsyncSession, project_id: Any) -> bool:
    rec = (
        await db.execute(
            select(PlantationSatelliteRecord)
            .join(PlantationFence, PlantationFence.id == PlantationSatelliteRecord.fence_id)
            .where(PlantationFence.project_id == project_id)
            .order_by(PlantationSatelliteRecord.scene_acquired_at.asc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return rec is not None


async def _deliverable_status(
    db: AsyncSession,
    project: PlantingProject,
    deliverable: str,
    *,
    refs: dict[str, Any],
    fences: list[PlantationFence],
    trees: list[Tree],
    green_belt: dict[str, Any],
    native_pct: float,
    native_target: float | None,
    scan_coverage_pct: float,
    open_block_violations: bool,
    ledger_synced: bool,
) -> str:
    if deliverable == "ibm_closure_plan_ref":
        return "complete" if refs.get("ibm_closure_plan_ref") else "pending"
    if deliverable == "mine_lease_number":
        return "complete" if refs.get("mine_lease_number") else "pending"
    if deliverable == "work_areas_drawn":
        return "complete" if fences else "pending"
    if deliverable == "satellite_baseline":
        return "complete" if await _has_satellite_baseline(db, project.id) else "pending"
    if deliverable == "ec_green_belt_met":
        if not green_belt.get("applicable"):
            return "not_applicable"
        return "complete" if green_belt.get("status") == "compliant" else (
            "partial" if green_belt.get("status") == "partial" else "pending"
        )
    if deliverable == "native_stocking_met":
        if native_target is None:
            return "not_applicable"
        if native_pct >= native_target:
            return "complete"
        if native_pct > 0:
            return "partial"
        return "pending"
    if deliverable == "trees_registered":
        return "complete" if trees else "pending"
    if deliverable == "satellite_mrv_active":
        if scan_coverage_pct >= 80:
            return "complete"
        if scan_coverage_pct >= 40:
            return "partial"
        return "pending"
    if deliverable == "survival_survey_active":
        survey_days = (project.metadata_ or {}).get("survey_interval_days")
        return "complete" if survey_days in (15, 30) else "pending"
    if deliverable == "no_block_violations":
        return "complete" if not open_block_violations else "pending"
    if deliverable == "fmcp_documented":
        fmcp_ref = refs.get("fmcp_reference") or refs.get("ibm_fmcp_ref")
        return "complete" if fmcp_ref else "pending"
    if deliverable == "credit_ledger_synced":
        return "complete" if ledger_synced else "pending"
    return "pending"


def _phase_status(deliverables: list[dict[str, Any]], current_code: str | None, phase_code: str) -> str:
    statuses = {d["status"] for d in deliverables}
    if statuses == {"complete"} or statuses <= {"complete", "not_applicable"}:
        return "complete"
    current_idx = CLOSURE_PHASE_ORDER.index(current_code) if current_code in CLOSURE_PHASE_ORDER else -1
    phase_idx = CLOSURE_PHASE_ORDER.index(phase_code)
    if phase_idx < current_idx:
        return "complete"
    if phase_idx == current_idx:
        return "in_progress"
    if any(s in ("complete", "partial") for s in statuses):
        return "in_progress"
    return "pending"


async def compute_closure_milestones(
    db: AsyncSession,
    project: PlantingProject,
) -> dict[str, Any]:
    standard = await get_active_standard(db, project)
    rules: dict[str, Any] = (
        await get_effective_rules(db, standard, project_id=project.id)
        if standard is not None
        else {}
    )

    if not _closure_tracking_enabled(project, rules):
        return {
            "applicable": False,
            "status": "not_applicable",
            "reason": "progressive_closure_not_enabled",
        }

    refs = _scheme_refs(project)
    current_phase = refs.get("closure_phase")
    closure_plan_year = refs.get("closure_plan_year")

    fences = list(
        (
            await db.execute(
                select(PlantationFence).where(PlantationFence.project_id == project.id)
            )
        ).scalars().all()
    )
    trees = list(
        (
            await db.execute(
                select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
            )
        ).scalars().all()
    )

    green_belt = await compute_green_belt_compliance(
        db, project, rules=rules, fences=fences
    )
    native_pct = _native_species_pct(trees)
    native_target = rules.get("species_native_pct_min")
    if native_target is not None:
        native_target = float(native_target)

    max_days = int(rules.get("satellite_scan_cadence_days") or 35)
    scan_metrics = scan_coverage_metrics(fences, max_days_since_scan=max_days)
    scan_coverage_pct = float(scan_metrics["scan_coverage_pct"])

    open_block = (
        await db.execute(
            select(PlantingComplianceViolation).where(
                PlantingComplianceViolation.project_id == project.id,
                PlantingComplianceViolation.resolved_at.is_(None),
                PlantingComplianceViolation.severity == "block",
            )
        )
    ).scalars().first() is not None

    ledger = (
        await db.execute(
            select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
        )
    ).scalar_one_or_none()
    ledger_synced = bool(ledger and ledger.last_computed_at)

    phases: list[dict[str, Any]] = []
    alerts: list[dict[str, str]] = []
    now = datetime.now(UTC)

    for phase_def in CLOSURE_PHASE_DEFINITIONS:
        deliverable_rows: list[dict[str, Any]] = []
        for key in phase_def["deliverables"]:
            status = await _deliverable_status(
                db,
                project,
                key,
                refs=refs,
                fences=fences,
                trees=trees,
                green_belt=green_belt,
                native_pct=native_pct,
                native_target=native_target,
                scan_coverage_pct=scan_coverage_pct,
                open_block_violations=open_block,
                ledger_synced=ledger_synced,
            )
            deliverable_rows.append({"key": key, "status": status})

        phase_status = _phase_status(deliverable_rows, current_phase, phase_def["code"])
        due_months = phase_def["typical_months_from_plan"]
        due_year: int | None = None
        if closure_plan_year is not None:
            try:
                due_year = int(closure_plan_year) + (due_months // 12)
            except (TypeError, ValueError):
                due_year = None

        if (
            phase_status in ("in_progress", "pending")
            and current_phase == phase_def["code"]
            and due_year is not None
            and now.year > due_year
        ):
            alerts.append(
                {
                    "kind": "phase_overdue",
                    "phase_code": phase_def["code"],
                    "message": (
                        f"{phase_def['label']} deliverables are overdue relative to "
                        f"closure plan year {closure_plan_year}."
                    ),
                }
            )

        phases.append(
            {
                "code": phase_def["code"],
                "label": phase_def["label"],
                "order": phase_def["order"],
                "status": phase_status,
                "is_current": current_phase == phase_def["code"],
                "typical_months_from_plan": due_months,
                "target_year": due_year,
                "deliverables": deliverable_rows,
            }
        )

    if green_belt.get("applicable") and green_belt.get("status") != "compliant":
        alerts.append(
            {
                "kind": "ec_green_belt_shortfall",
                "phase_code": current_phase or "phase_ii_greenbelt",
                "message": (
                    f"EC green belt covers {green_belt.get('coverage_pct', 0):.1f}% of "
                    f"the required {green_belt.get('ec_green_belt_pct_required', 33)}% "
                    f"({green_belt.get('mapped_green_belt_ha', 0)} / "
                    f"{green_belt.get('required_green_belt_ha', 0)} ha)."
                ),
            }
        )

    completed = sum(1 for p in phases if p["status"] == "complete")
    overall = "complete" if completed == len(phases) else (
        "in_progress" if completed > 0 or current_phase else "not_started"
    )

    return {
        "applicable": True,
        "status": overall,
        "current_phase": current_phase,
        "closure_plan_year": closure_plan_year,
        "ibm_closure_plan_ref": refs.get("ibm_closure_plan_ref"),
        "fmcp_reference": refs.get("fmcp_reference") or refs.get("ibm_fmcp_ref"),
        "phases": phases,
        "green_belt": green_belt,
        "native_species_pct": native_pct,
        "native_species_target_pct": native_target,
        "scan_coverage_pct": scan_coverage_pct,
        "alerts": alerts,
    }


async def build_mining_compliance_signals(
    db: AsyncSession,
    project: PlantingProject,
    *,
    trees: list[Tree] | None = None,
    open_block_violations: bool,
    scan_coverage_pct: float | None = None,
) -> dict[str, str]:
    refs = _scheme_refs(project)
    signals: dict[str, str] = {}

    signals["mine_lease_linked"] = "yes" if refs.get("mine_lease_number") else "no"
    signals["closure_plan_on_file"] = "yes" if refs.get("ibm_closure_plan_ref") else "no"
    signals["reclamation_block_documented"] = (
        "yes" if refs.get("reclamation_block_type") else "no"
    )
    signals["closure_phase_recorded"] = "yes" if refs.get("closure_phase") else "no"

    if trees is None:
        trees = list(
            (
                await db.execute(
                    select(Tree).where(
                        Tree.project_id == project.id, Tree.status != "removed"
                    )
                )
            ).scalars().all()
        )

    standard = await get_active_standard(db, project)
    rules = (
        await get_effective_rules(db, standard, project_id=project.id)
        if standard is not None
        else {}
    )
    native_target = rules.get("species_native_pct_min")
    native_pct = _native_species_pct(trees)
    if native_target is not None:
        if native_pct >= float(native_target):
            signals["native_stocking_target"] = "yes"
        elif native_pct > 0:
            signals["native_stocking_target"] = "partial"
        else:
            signals["native_stocking_target"] = "no"
    else:
        signals["native_stocking_target"] = "na"

    if scan_coverage_pct is None:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id == project.id)
                )
            ).scalars().all()
        )
        max_days = int(rules.get("satellite_scan_cadence_days") or 30)
        scan_coverage_pct = float(
            scan_coverage_metrics(fences, max_days_since_scan=max_days)["scan_coverage_pct"]
        )

    if scan_coverage_pct >= 80:
        signals["satellite_mrv_active"] = "yes"
    elif scan_coverage_pct >= 40:
        signals["satellite_mrv_active"] = "partial"
    else:
        signals["satellite_mrv_active"] = "no"

    green_belt = await compute_green_belt_compliance(db, project, rules=rules)
    if green_belt.get("applicable"):
        status = green_belt.get("status")
        signals["ec_green_belt_compliant"] = (
            "yes" if status == "compliant" else ("partial" if status == "partial" else "no")
        )
    else:
        signals["ec_green_belt_compliant"] = "na"

    signals["fmcp_documented"] = (
        "yes" if refs.get("fmcp_reference") or refs.get("ibm_fmcp_ref") else "no"
    )
    signals["no_block_violations"] = "no" if open_block_violations else "yes"

    return signals
