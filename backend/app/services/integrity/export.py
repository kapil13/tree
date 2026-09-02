"""Integrity fusion export payloads for MRV and evidence bundles."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_ledger import ProjectCreditLedger
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.credit_gating import integrity_gate_detail


async def build_integrity_fusion_export(
    db: AsyncSession,
    project: PlantingProject,
) -> dict[str, Any]:
    detail = await integrity_gate_detail(db, project.id)
    rows = (
        await db.execute(
            select(Tree, TreeRiskScore)
            .outerjoin(TreeRiskScore, TreeRiskScore.tree_id == Tree.id)
            .where(Tree.project_id == project.id, Tree.status != "removed")
            .order_by(Tree.public_code.asc())
            .limit(2000)
        )
    ).all()

    tree_rows: list[dict[str, Any]] = []
    for tree, risk in rows:
        tree_rows.append(
            {
                "public_code": tree.public_code,
                "verification_status": tree.verification_status,
                "fusion_score": float(risk.fusion_score) if risk and risk.fusion_score is not None else None,
                "field_score": float(risk.field_score) if risk and risk.field_score is not None else None,
                "satellite_score": float(risk.satellite_score) if risk and risk.satellite_score is not None else None,
                "composite_risk": float(risk.composite_risk) if risk and risk.composite_risk is not None else None,
                "credit_eligible": bool(risk.credit_eligible) if risk else False,
                "gps_photo_match": bool(risk.gps_photo_match) if risk else False,
                "duplicate_photo": bool(risk.duplicate_photo) if risk else False,
                "duplicate_coordinate": bool(risk.duplicate_coordinate) if risk else False,
                "ai_confidence_low": bool(risk.ai_confidence_low) if risk else False,
                "regeotag_mismatch": bool(risk.regeotag_mismatch) if risk else False,
            }
        )

    ledger_res = await db.execute(
        select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
    )
    ledger = ledger_res.scalar_one_or_none()
    ledger_summary = None
    if ledger is not None:
        ledger_summary = {
            "status": ledger.status,
            "tree_count": ledger.tree_count,
            "net_credits_tco2e": float(ledger.net_credits_tco2e),
            "methodology": ledger.methodology,
            "registry_reference": ledger.registry_reference,
        }

    return {
        "export_version": "aranyix-integrity-fusion-1.0.0",
        "generated_at": datetime.now(UTC).isoformat(),
        "project_id": str(project.id),
        "project_code": project.code,
        "gates": {
            "verified_ready": detail["verified_ready"],
            "issued_ready": detail["issued_ready"],
            "verified_requirements": detail["verified_requirements"],
            "issued_requirements": detail["issued_requirements"],
        },
        "summary": {
            "tree_count": detail["tree_count"],
            "credit_eligible_count": detail["credit_eligible_count"],
            "audit_ready_count": detail["audit_ready_count"],
            "eligible_pct": detail["eligible_pct"],
            "audit_ready_pct": detail["audit_ready_pct"],
            "avg_fusion_score": detail["avg_fusion_score"],
            "message": detail["message"],
        },
        "blocking_trees": detail["blocking_trees"],
        "trees": tree_rows,
        "credit_ledger": ledger_summary,
    }
