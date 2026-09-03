"""Project-level credit gating from tree integrity fusion scores."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.fusion import FUSION_CREDIT_MIN_SCORE, FUSION_ISSUE_MIN_SCORE
from app.services.integrity.monitoring_gate import project_monitoring_gate

VERIFIED_MIN_ELIGIBLE_PCT = 80.0
ISSUED_MIN_AUDIT_READY_PCT = 90.0


@dataclass
class ProjectIntegrityGate:
    passed: bool
    tree_count: int
    credit_eligible_count: int
    audit_ready_count: int
    avg_fusion_score: float | None
    message: str
    blocking_trees: list[str]


@dataclass
class IntegrityGateError(ValueError):
    code: str
    summary: dict[str, Any]

    def __init__(self, code: str, summary: dict[str, Any]) -> None:
        self.code = code
        self.summary = summary
        super().__init__(code)


def _blocking_reasons(tree: Tree, risk: TreeRiskScore | None) -> list[str]:
    if risk is None or risk.fusion_score is None:
        return ["integrity_not_computed"]
    reasons: list[str] = []
    if bool(getattr(risk, "duplicate_photo", False)):
        reasons.append("duplicate_photo")
    if bool(getattr(risk, "duplicate_coordinate", False)):
        reasons.append("duplicate_coordinate")
    if float(getattr(risk, "composite_risk", 0) or 0) >= 0.35:
        reasons.append("composite_risk_high")
    if float(risk.fusion_score) < FUSION_CREDIT_MIN_SCORE:
        reasons.append("fusion_below_minimum")
    if tree.verification_status == "registered":
        reasons.append("not_field_verified")
    if not getattr(risk, "credit_eligible", False) and not reasons:
        reasons.append("not_credit_eligible")
    return reasons


def _blocking_tree_detail(tree: Tree, risk: TreeRiskScore | None) -> dict[str, Any]:
    tree_id = getattr(tree, "id", None)
    return {
        "tree_id": str(tree_id) if tree_id is not None else "",
        "public_code": tree.public_code,
        "verification_status": tree.verification_status,
        "fusion_score": float(risk.fusion_score) if risk and risk.fusion_score is not None else None,
        "credit_eligible": bool(getattr(risk, "credit_eligible", False)) if risk else False,
        "reasons": _blocking_reasons(tree, risk),
    }


async def project_integrity_summary(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> ProjectIntegrityGate:
    rows = (
        await db.execute(
            select(Tree, TreeRiskScore)
            .outerjoin(TreeRiskScore, TreeRiskScore.tree_id == Tree.id)
            .where(Tree.project_id == project_id, Tree.status != "removed")
        )
    ).all()
    tree_count = len(rows)
    if tree_count == 0:
        return ProjectIntegrityGate(
            passed=False,
            tree_count=0,
            credit_eligible_count=0,
            audit_ready_count=0,
            avg_fusion_score=None,
            message="No trees in project for integrity gating.",
            blocking_trees=[],
        )

    eligible = 0
    audit_ready = 0
    fusion_vals: list[float] = []
    blocking: list[str] = []
    for tree, risk in rows:
        if risk is None or risk.fusion_score is None:
            blocking.append(tree.public_code)
            continue
        fusion_vals.append(float(risk.fusion_score))
        if risk.credit_eligible:
            eligible += 1
        if tree.verification_status == "audit_ready":
            audit_ready += 1
        elif not risk.credit_eligible:
            blocking.append(tree.public_code)

    avg_fusion = round(sum(fusion_vals) / len(fusion_vals), 2) if fusion_vals else None
    eligible_pct = 100.0 * eligible / tree_count
    return ProjectIntegrityGate(
        passed=eligible_pct >= VERIFIED_MIN_ELIGIBLE_PCT,
        tree_count=tree_count,
        credit_eligible_count=eligible,
        audit_ready_count=audit_ready,
        avg_fusion_score=avg_fusion,
        message=(
            f"{eligible}/{tree_count} trees credit-eligible "
            f"({eligible_pct:.0f}%, need {VERIFIED_MIN_ELIGIBLE_PCT:.0f}%)."
        ),
        blocking_trees=blocking[:20],
    )


async def assert_credit_transition_allowed(
    db: AsyncSession,
    project_id: uuid.UUID,
    *,
    to_status: str,
) -> None:
    detail = await integrity_gate_detail(db, project_id)
    if to_status == "verified":
        if detail["tree_count"] == 0:
            raise IntegrityGateError("integrity_gate_failed:no_trees", detail)
        monitoring = await project_monitoring_gate(db, project_id)
        detail = {**detail, "monitoring_gate": monitoring}
        if not monitoring["passed"]:
            reason = monitoring["reasons"][0] if monitoring["reasons"] else "monitoring"
            raise IntegrityGateError(f"integrity_gate_failed:verified:{reason}", detail)
        if not detail["verified_ready"]:
            if detail["eligible_pct"] < VERIFIED_MIN_ELIGIBLE_PCT:
                code = (
                    f"integrity_gate_failed:verified:"
                    f"{detail['credit_eligible_count']}/{detail['tree_count']}"
                )
            elif (
                detail["avg_fusion_score"] is not None
                and detail["avg_fusion_score"] < FUSION_CREDIT_MIN_SCORE
            ):
                code = f"integrity_gate_failed:avg_fusion_below_{int(FUSION_CREDIT_MIN_SCORE)}"
            else:
                code = "integrity_gate_failed:verified"
            raise IntegrityGateError(code, detail)
    if to_status == "issued":
        if detail["tree_count"] == 0:
            raise IntegrityGateError("integrity_gate_failed:no_trees", detail)
        if not detail["issued_ready"]:
            if detail["audit_ready_pct"] < ISSUED_MIN_AUDIT_READY_PCT:
                code = (
                    f"integrity_gate_failed:issued:"
                    f"{detail['audit_ready_count']}/{detail['tree_count']}"
                )
            elif (
                detail["avg_fusion_score"] is not None
                and detail["avg_fusion_score"] < FUSION_ISSUE_MIN_SCORE
            ):
                code = f"integrity_gate_failed:avg_fusion_below_{int(FUSION_ISSUE_MIN_SCORE)}"
            else:
                code = "integrity_gate_failed:issued"
            raise IntegrityGateError(code, detail)


async def project_fusion_stats(db: AsyncSession, project_id: uuid.UUID) -> dict:
    detail = await integrity_gate_detail(db, project_id)
    return {
        "tree_count": detail["tree_count"],
        "credit_eligible_count": detail["credit_eligible_count"],
        "audit_ready_count": detail["audit_ready_count"],
        "avg_fusion_score": detail["avg_fusion_score"],
        "eligible_pct": detail["eligible_pct"],
        "audit_ready_pct": detail["audit_ready_pct"],
        "passed_for_verified": detail["verified_ready"],
        "passed_for_issued": detail["issued_ready"],
        "blocking_sample": [t["public_code"] for t in detail["blocking_trees"][:10]],
        "message": detail["message"],
    }


async def integrity_gate_detail(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> dict[str, Any]:
    rows = (
        await db.execute(
            select(Tree, TreeRiskScore)
            .outerjoin(TreeRiskScore, TreeRiskScore.tree_id == Tree.id)
            .where(Tree.project_id == project_id, Tree.status != "removed")
        )
    ).all()
    tree_count = len(rows)
    if tree_count == 0:
        return {
            "tree_count": 0,
            "credit_eligible_count": 0,
            "audit_ready_count": 0,
            "eligible_pct": 0.0,
            "audit_ready_pct": 0.0,
            "avg_fusion_score": None,
            "verified_ready": False,
            "issued_ready": False,
            "verified_requirements": {
                "min_eligible_pct": VERIFIED_MIN_ELIGIBLE_PCT,
                "min_avg_fusion": FUSION_CREDIT_MIN_SCORE,
            },
            "issued_requirements": {
                "min_audit_ready_pct": ISSUED_MIN_AUDIT_READY_PCT,
                "min_avg_fusion": FUSION_ISSUE_MIN_SCORE,
            },
            "blocking_trees": [],
            "message": "No trees in project for integrity gating.",
        }

    eligible = 0
    audit_ready = 0
    fusion_vals: list[float] = []
    blocking_details: list[dict[str, Any]] = []
    for tree, risk in rows:
        if risk is not None and risk.fusion_score is not None:
            fusion_vals.append(float(risk.fusion_score))
        if risk and risk.credit_eligible:
            eligible += 1
        if tree.verification_status == "audit_ready":
            audit_ready += 1
        reasons = _blocking_reasons(tree, risk)
        if reasons:
            blocking_details.append(_blocking_tree_detail(tree, risk))

    avg_fusion = round(sum(fusion_vals) / len(fusion_vals), 2) if fusion_vals else None
    eligible_pct = round(100.0 * eligible / tree_count, 1)
    audit_ready_pct = round(100.0 * audit_ready / tree_count, 1)
    verified_ready = (
        eligible_pct >= VERIFIED_MIN_ELIGIBLE_PCT
        and (avg_fusion is None or avg_fusion >= FUSION_CREDIT_MIN_SCORE)
    )
    issued_ready = (
        audit_ready_pct >= ISSUED_MIN_AUDIT_READY_PCT
        and (avg_fusion is None or avg_fusion >= FUSION_ISSUE_MIN_SCORE)
    )
    blocking_details.sort(
        key=lambda t: (t["fusion_score"] is not None, t["fusion_score"] or 0),
    )
    return {
        "tree_count": tree_count,
        "credit_eligible_count": eligible,
        "audit_ready_count": audit_ready,
        "eligible_pct": eligible_pct,
        "audit_ready_pct": audit_ready_pct,
        "avg_fusion_score": avg_fusion,
        "verified_ready": verified_ready,
        "issued_ready": issued_ready,
        "verified_requirements": {
            "min_eligible_pct": VERIFIED_MIN_ELIGIBLE_PCT,
            "min_avg_fusion": FUSION_CREDIT_MIN_SCORE,
        },
        "issued_requirements": {
            "min_audit_ready_pct": ISSUED_MIN_AUDIT_READY_PCT,
            "min_avg_fusion": FUSION_ISSUE_MIN_SCORE,
        },
        "blocking_trees": blocking_details[:50],
        "message": (
            f"{eligible}/{tree_count} trees credit-eligible "
            f"({eligible_pct:.0f}%, need {VERIFIED_MIN_ELIGIBLE_PCT:.0f}%). "
            f"{audit_ready}/{tree_count} audit-ready "
            f"({audit_ready_pct:.0f}%, need {ISSUED_MIN_AUDIT_READY_PCT:.0f}% for issue)."
        ),
    }
