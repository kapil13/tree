"""Project-level credit gating from tree integrity fusion scores."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.fusion import FUSION_CREDIT_MIN_SCORE, FUSION_ISSUE_MIN_SCORE

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
    summary = await project_integrity_summary(db, project_id)
    if to_status == "verified":
        if not summary.passed:
            raise ValueError(
                f"integrity_gate_failed:verified:{summary.credit_eligible_count}/"
                f"{summary.tree_count}"
            )
        if summary.avg_fusion_score is not None and summary.avg_fusion_score < FUSION_CREDIT_MIN_SCORE:
            raise ValueError(f"integrity_gate_failed:avg_fusion_below_{int(FUSION_CREDIT_MIN_SCORE)}")
    if to_status == "issued":
        if summary.tree_count == 0:
            raise ValueError("integrity_gate_failed:no_trees")
        audit_pct = 100.0 * summary.audit_ready_count / summary.tree_count
        if audit_pct < ISSUED_MIN_AUDIT_READY_PCT:
            raise ValueError(
                f"integrity_gate_failed:issued:{summary.audit_ready_count}/{summary.tree_count}"
            )
        if summary.avg_fusion_score is not None and summary.avg_fusion_score < FUSION_ISSUE_MIN_SCORE:
            raise ValueError(f"integrity_gate_failed:avg_fusion_below_{int(FUSION_ISSUE_MIN_SCORE)}")


async def project_fusion_stats(db: AsyncSession, project_id: uuid.UUID) -> dict:
    summary = await project_integrity_summary(db, project_id)
    return {
        "tree_count": summary.tree_count,
        "credit_eligible_count": summary.credit_eligible_count,
        "audit_ready_count": summary.audit_ready_count,
        "avg_fusion_score": summary.avg_fusion_score,
        "eligible_pct": round(100.0 * summary.credit_eligible_count / summary.tree_count, 1)
        if summary.tree_count
        else 0.0,
        "passed_for_verified": summary.passed,
        "blocking_sample": summary.blocking_trees[:10],
        "message": summary.message,
    }
