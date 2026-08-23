"""Evaluate compliance checklist responses with project auto-checks."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance_checklist import ProjectChecklistResponse
from app.models.credit_ledger import ProjectCreditLedger
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.compliance.checklist_engine import get_effective_checklist
from app.services.compliance.checklists import ComplianceChecklist
from app.services.planting_projects.service import get_active_standard
from app.services.planting_projects.survival_survey import survey_interval_days


def _tree_metadata_native(metadata: dict | None) -> bool:
    """Match planting compliance native checks (is_native + species_native metadata)."""
    meta = metadata or {}
    for key in ("is_native", "species_native"):
        val = meta.get(key)
        if val in (True, "true", "yes", "1", "native"):
            return True
        if val in (False, "false", "no", "0", "exotic"):
            return False
    return False


def _answer_value(answer: str | None) -> float | None:
    if answer == "yes":
        return 1.0
    if answer == "partial":
        return 0.5
    if answer == "no":
        return 0.0
    return None


def _resolve_answer(
    item_id: str,
    auto_key: str | None,
    responses: dict[str, Any],
    auto_signals: dict[str, str],
) -> str | None:
    saved = responses.get(item_id, {}).get("answer")
    if saved:
        return saved
    if auto_key and auto_key in auto_signals:
        return auto_signals[auto_key]
    return None


def score_checklist(
    checklist: ComplianceChecklist,
    responses: dict[str, Any],
    auto_signals: dict[str, str],
) -> dict[str, Any]:
    required_items = [i for i in checklist.items if i.required]
    answered_required = 0
    weighted_scores: list[float] = []
    gaps: list[dict[str, str]] = []

    for item in checklist.items:
        answer = _resolve_answer(item.id, item.auto_key, responses, auto_signals)
        if item.required:
            if answer in ("yes", "no", "partial", "na"):
                answered_required += 1
            if answer in ("yes", "no", "partial"):
                value = _answer_value(answer)
                if value is not None and answer != "na":
                    weighted_scores.append(value)
                    if answer in ("no", "partial"):
                        gaps.append(
                            {
                                "item_id": item.id,
                                "question": item.question,
                                "answer": answer,
                                "category": item.category,
                                "auto_key": item.auto_key,
                            }
                        )

    completion_pct = (
        round((answered_required / len(required_items)) * 100, 1) if required_items else 0.0
    )
    score_pct = round((sum(weighted_scores) / len(weighted_scores)) * 100, 1) if weighted_scores else 0.0

    if answered_required == 0:
        eligibility_status = "not_started"
    elif answered_required < len(required_items):
        eligibility_status = "in_progress"
    elif score_pct >= 85.0 and not any(g["answer"] == "no" for g in gaps):
        eligibility_status = "eligible"
    elif score_pct >= 50.0:
        eligibility_status = "gaps_identified"
    else:
        eligibility_status = "not_eligible"

    return {
        "completion_pct": completion_pct,
        "score_pct": score_pct,
        "eligibility_status": eligibility_status,
        "gaps": gaps,
        "answered_required": answered_required,
        "required_count": len(required_items),
    }


async def build_auto_signals(db: AsyncSession, project: PlantingProject) -> dict[str, str]:
    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    tree_count = len(trees)
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    satellite_verified = sum(1 for t in trees if t.satellite_verified)
    native_count = sum(1 for t in trees if _tree_metadata_native(t.metadata_))

    open_violations_res = await db.execute(
        select(PlantingComplianceViolation).where(
            PlantingComplianceViolation.project_id == project.id,
            PlantingComplianceViolation.resolved_at.is_(None),
        )
    )
    open_violations = list(open_violations_res.scalars().all())
    block_open = any(v.severity == "block" for v in open_violations)

    from app.models.plantation_fence import PlantationFence

    work_areas = int(
        (
            await db.execute(
                select(func.count()).where(PlantationFence.project_id == project.id)
            )
        ).scalar_one()
        or 0
    )

    ledger_res = await db.execute(
        select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
    )
    ledger = ledger_res.scalar_one_or_none()

    standard = await get_active_standard(db, project)
    survey_days = survey_interval_days(project)
    survey_saved = (project.metadata_ or {}).get("survey_interval_days") in (15, 30)

    signals: dict[str, str] = {}

    signals["has_trees"] = "yes" if tree_count > 0 else "no"
    signals["has_work_areas"] = "yes" if work_areas > 0 else "no"
    signals["no_block_violations"] = "no" if block_open else "yes"
    signals["no_open_violations"] = "no" if open_violations else "yes"
    signals["active_standard_attached"] = "yes" if standard is not None else "no"
    if survey_saved:
        signals["survival_survey_configured"] = "yes"
    elif survey_days in (15, 30):
        signals["survival_survey_configured"] = "partial"
    else:
        signals["survival_survey_configured"] = "no"
    signals["credit_ledger_synced"] = "yes" if ledger and ledger.last_computed_at else "no"
    signals["credit_ledger_active"] = "yes" if ledger and float(ledger.gross_credits_tco2e or 0) > 0 else "no"

    from app.services.carbon.risk_ops import latest_risk_assessment

    risk = await latest_risk_assessment(db, project.id)
    signals["nprt_assessed"] = "yes" if risk is not None else "no"
    signals["evidence_export"] = "yes" if tree_count > 0 else "no"

    if tree_count == 0:
        signals["geo_tagged_majority"] = "no"
        signals["satellite_coverage"] = "no"
        signals["native_species_tracked"] = "na"
    else:
        geo_pct = geo_tagged / tree_count
        if geo_pct >= 0.8:
            signals["geo_tagged_majority"] = "yes"
        elif geo_pct >= 0.5:
            signals["geo_tagged_majority"] = "partial"
        else:
            signals["geo_tagged_majority"] = "no"

        sat_pct = satellite_verified / tree_count
        if sat_pct >= 0.5:
            signals["satellite_coverage"] = "yes"
        elif sat_pct >= 0.2:
            signals["satellite_coverage"] = "partial"
        else:
            signals["satellite_coverage"] = "no"

        if native_count > 0:
            signals["native_species_tracked"] = "yes"
        else:
            signals["native_species_tracked"] = "partial"

    from app.services.compliance.safeguards import safeguard_doc_types_present

    doc_types = await safeguard_doc_types_present(db, project.id)
    for doc_type, signal_key in (
        ("gram_sabha_resolution", "safeguards_gram_sabha"),
        ("fpic_minutes", "safeguards_fpic"),
        ("patta_cfr_reference", "safeguards_tenure_ref"),
        ("stakeholder_consultation_log", "safeguards_stakeholder_log"),
    ):
        signals[signal_key] = "yes" if doc_type in doc_types else "no"

    refs = (project.metadata_ or {}).get("scheme_refs") or {}
    signals["land_bank_registered"] = (
        "yes" if refs.get("green_credit_land_bank_id") else "no"
    )
    signals["verifier_on_file"] = "yes" if refs.get("verifier_reference") else "no"
    signals["gcp_activity_documented"] = (
        "yes" if refs.get("gcp_activity_type") else "no"
    )

    if getattr(project, "scheme_code", None) == "green_credit_india" or refs.get(
        "green_credit_land_bank_id"
    ):
        from app.services.credits.green_credit import build_project_green_credit_summary

        gc = await build_project_green_credit_summary(db, project)
        signals["density_eligible"] = "yes" if gc.get("density_eligible") else "no"
    else:
        signals["density_eligible"] = "na"

    nba_flagged = 0
    nba_acknowledged = 0
    for tree in trees:
        meta = tree.metadata_ or {}
        flagged = (
            meta.get("is_exotic") in (True, "true", "yes", 1)
            or meta.get("species_category") in ("exotic", "medicinal", "scheduled")
            or meta.get("is_scheduled_species") in (True, "true", "yes", 1)
        )
        if flagged:
            nba_flagged += 1
            if meta.get("nba_acknowledgment_at"):
                nba_acknowledged += 1
    if nba_flagged == 0:
        signals["nba_species_reviewed"] = "yes"
    elif nba_acknowledged >= nba_flagged:
        signals["nba_species_reviewed"] = "yes"
    elif nba_acknowledged > 0:
        signals["nba_species_reviewed"] = "partial"
    else:
        signals["nba_species_reviewed"] = "no"

    return signals


def _item_payload(
    item,
    responses: dict[str, Any],
    auto_signals: dict[str, str],
) -> dict[str, Any]:
    item_id = item.id if hasattr(item, "id") else item["id"]
    auto_key = item.auto_key if hasattr(item, "auto_key") else item.get("auto_key")
    category = item.category if hasattr(item, "category") else item["category"]
    question = item.question if hasattr(item, "question") else item["question"]
    guidance = item.guidance if hasattr(item, "guidance") else item["guidance"]
    required = item.required if hasattr(item, "required") else item["required"]

    saved = responses.get(item_id, {})
    suggested = auto_signals.get(auto_key) if auto_key else None
    resolved = saved.get("answer") or suggested
    source = "user" if saved.get("answer") else ("auto" if suggested else None)
    return {
        "id": item_id,
        "category": category,
        "question": question,
        "guidance": guidance,
        "required": required,
        "auto_key": auto_key,
        "answer": resolved,
        "notes": saved.get("notes"),
        "source": source,
        "suggested_answer": suggested,
    }


def _checklist_items_for_scoring(effective: dict[str, Any]):
    from types import SimpleNamespace

    return [SimpleNamespace(**item) for item in effective["items"]]


def _checklist_for_scoring(effective: dict[str, Any]):
    from types import SimpleNamespace

    return SimpleNamespace(items=_checklist_items_for_scoring(effective))


async def get_or_create_response(
    db: AsyncSession, project: PlantingProject, checklist_code: str
) -> ProjectChecklistResponse | None:
    res = await db.execute(
        select(ProjectChecklistResponse).where(
            ProjectChecklistResponse.project_id == project.id,
            ProjectChecklistResponse.checklist_code == checklist_code,
        )
    )
    return res.scalar_one_or_none()


async def build_project_checklist_state(
    db: AsyncSession,
    project: PlantingProject,
    checklist_code: str,
) -> dict[str, Any]:
    effective = await get_effective_checklist(db, checklist_code)
    if effective is None:
        raise ValueError("unknown_checklist")

    stored = await get_or_create_response(db, project, checklist_code)
    responses = dict(stored.responses) if stored else {}
    auto_signals = await build_auto_signals(db, project)
    checklist_for_score = _checklist_for_scoring(effective)
    metrics = score_checklist(checklist_for_score, responses, auto_signals)

    return {
        "checklist": {
            "code": effective["code"],
            "title": effective["title"],
            "short_label": effective["short_label"],
            "framework_reference": effective["framework_reference"],
            "description": effective["description"],
            "disclaimer": effective["disclaimer"],
        },
        "project_id": str(project.id),
        "responses": responses,
        "items": [
            _item_payload(item, responses, auto_signals) for item in effective["items"]
        ],
        "auto_signals": auto_signals,
        "completion_pct": metrics["completion_pct"],
        "score_pct": metrics["score_pct"],
        "eligibility_status": metrics["eligibility_status"],
        "gaps": metrics["gaps"],
        "answered_required": metrics["answered_required"],
        "required_count": metrics["required_count"],
        "updated_at": stored.updated_at.isoformat() if stored else None,
    }


async def save_project_checklist_responses(
    db: AsyncSession,
    project: PlantingProject,
    checklist_code: str,
    answers: dict[str, dict[str, Any]],
    *,
    actor_user_id: uuid.UUID | None,
) -> dict[str, Any]:
    effective = await get_effective_checklist(db, checklist_code)
    if effective is None:
        raise ValueError("unknown_checklist")

    valid_ids = {item["id"] for item in effective["items"]}
    cleaned: dict[str, Any] = {}
    for item_id, payload in answers.items():
        if item_id not in valid_ids:
            continue
        answer = payload.get("answer")
        if answer not in ("yes", "no", "partial", "na", None):
            raise ValueError(f"invalid_answer:{item_id}")
        entry: dict[str, Any] = {}
        if answer:
            entry["answer"] = answer
        notes = payload.get("notes")
        if notes:
            entry["notes"] = str(notes)[:2000]
        if entry:
            cleaned[item_id] = entry

    stored = await get_or_create_response(db, project, checklist_code)
    if stored is None:
        stored = ProjectChecklistResponse(
            project_id=project.id,
            organization_id=project.organization_id,
            checklist_code=checklist_code,
            responses={},
            completion_pct=0,
            score_pct=0,
            eligibility_status="not_started",
            last_updated_by_user_id=actor_user_id,
        )
        db.add(stored)

    merged = dict(stored.responses or {})
    merged.update(cleaned)
    stored.responses = merged
    stored.last_updated_by_user_id = actor_user_id
    if stored.organization_id is None:
        stored.organization_id = project.organization_id

    auto_signals = await build_auto_signals(db, project)
    checklist_for_score = _checklist_for_scoring(effective)
    metrics = score_checklist(checklist_for_score, merged, auto_signals)
    stored.completion_pct = metrics["completion_pct"]
    stored.score_pct = metrics["score_pct"]
    stored.eligibility_status = metrics["eligibility_status"]

    from app.services.schemes.compliance import notify_scheme_compliance_gaps

    await notify_scheme_compliance_gaps(
        db,
        project,
        checklist_code,
        metrics["eligibility_status"],
    )

    await db.flush()
    return await build_project_checklist_state(db, project, checklist_code)


async def list_project_checklist_summaries(
    db: AsyncSession, project: PlantingProject
) -> list[dict[str, Any]]:
    from app.services.compliance.checklists import CHECKLISTS

    stored_res = await db.execute(
        select(ProjectChecklistResponse).where(ProjectChecklistResponse.project_id == project.id)
    )
    by_code = {row.checklist_code: row for row in stored_res.scalars().all()}
    auto_signals = await build_auto_signals(db, project)
    summaries: list[dict[str, Any]] = []

    for code in CHECKLISTS:
        effective = await get_effective_checklist(db, code)
        if effective is None:
            continue
        stored = by_code.get(code)
        responses = dict(stored.responses) if stored else {}
        checklist_for_score = _checklist_for_scoring(effective)
        metrics = score_checklist(checklist_for_score, responses, auto_signals)
        summaries.append(
            {
                "code": code,
                "title": effective["title"],
                "short_label": effective["short_label"],
                "completion_pct": metrics["completion_pct"],
                "score_pct": metrics["score_pct"],
                "eligibility_status": metrics["eligibility_status"],
                "updated_at": stored.updated_at.isoformat() if stored else None,
            }
        )
    return summaries
