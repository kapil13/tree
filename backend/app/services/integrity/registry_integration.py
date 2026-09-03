"""Phase 4: fuse integrity scores into registry claims and serial issuance."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.credit_gating import integrity_gate_detail


@dataclass
class TreeRegistryEligibility:
    eligible: bool
    fusion_score: float | None
    verification_status: str
    reasons: list[str]


@dataclass
class RegistryClaimsResult:
    registered: list[str]
    skipped: list[str]
    skipped_details: list[dict[str, Any]]


async def tree_registry_eligibility(
    db: AsyncSession,
    tree_id: uuid.UUID,
) -> TreeRegistryEligibility:
    res = await db.execute(
        select(Tree, TreeRiskScore)
        .outerjoin(TreeRiskScore, TreeRiskScore.tree_id == Tree.id)
        .where(Tree.id == tree_id)
    )
    row = res.first()
    if row is None:
        return TreeRegistryEligibility(
            eligible=False,
            fusion_score=None,
            verification_status="unknown",
            reasons=["tree_not_found"],
        )
    tree, risk = row
    reasons: list[str] = []
    if risk is None or risk.fusion_score is None:
        reasons.append("integrity_not_computed")
    if tree.verification_status != "audit_ready":
        reasons.append("not_audit_ready")
    fusion_details = (getattr(risk, "fusion_details", None) or {}) if risk else {}
    for blocker in fusion_details.get("audit_ready_blockers") or []:
        if blocker not in reasons:
            reasons.append(str(blocker))
    if risk is not None and not risk.credit_eligible and not reasons:
        reasons.append("not_credit_eligible")
    if risk is not None:
        fusion = float(risk.fusion_score) if risk.fusion_score is not None else None
    else:
        fusion = None
    return TreeRegistryEligibility(
        eligible=len(reasons) == 0,
        fusion_score=fusion,
        verification_status=tree.verification_status,
        reasons=reasons,
    )


async def assert_tree_registry_eligible(db: AsyncSession, tree_id: uuid.UUID) -> TreeRegistryEligibility:
    result = await tree_registry_eligibility(db, tree_id)
    if not result.eligible:
        code = f"registry_gate_failed:{','.join(result.reasons)}"
        raise ValueError(code)
    return result


async def build_issue_integrity_snapshot(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> dict[str, Any]:
    detail = await integrity_gate_detail(db, project_id)
    return {
        "tree_count": detail["tree_count"],
        "credit_eligible_count": detail["credit_eligible_count"],
        "audit_ready_count": detail["audit_ready_count"],
        "eligible_pct": detail["eligible_pct"],
        "audit_ready_pct": detail["audit_ready_pct"],
        "avg_fusion_score": detail["avg_fusion_score"],
        "verified_ready": detail["verified_ready"],
        "issued_ready": detail["issued_ready"],
        "monitoring_ready": detail.get("monitoring_ready"),
        "monitoring_gate": detail.get("monitoring_gate"),
    }


async def registry_readiness(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any]:
    detail = await integrity_gate_detail(db, project_id)
    return {
        "tree_count": detail["tree_count"],
        "credit_eligible_count": detail["credit_eligible_count"],
        "audit_ready_count": detail["audit_ready_count"],
        "eligible_pct": detail["eligible_pct"],
        "audit_ready_pct": detail["audit_ready_pct"],
        "avg_fusion_score": detail["avg_fusion_score"],
        "verified_ready": detail["verified_ready"],
        "issued_ready": detail["issued_ready"],
        "monitoring_ready": detail.get("monitoring_ready"),
        "claimable_tree_count": detail["audit_ready_count"],
        "registry_issue_ready": detail["issued_ready"],
        "blocking_trees": detail["blocking_trees"][:20],
        "message": detail["message"],
    }
