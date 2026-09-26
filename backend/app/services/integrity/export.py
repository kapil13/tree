"""Integrity fusion export payloads for MRV and evidence bundles."""

from __future__ import annotations

import csv
import io
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_ledger import ProjectCreditLedger
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.credit_gating import integrity_gate_detail

TREE_CSV_COLUMNS = [
    "public_code",
    "verification_status",
    "fusion_score",
    "field_score",
    "satellite_score",
    "composite_risk",
    "credit_eligible",
    "gps_photo_match",
    "duplicate_photo",
    "duplicate_coordinate",
    "ai_confidence_low",
    "regeotag_mismatch",
    "photo_span_days",
    "audit_ready_blockers",
]


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
        fusion_details = (risk.fusion_details or {}) if risk else {}
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
                "audit_ready_blockers": fusion_details.get("audit_ready_blockers") or [],
                "photo_span_days": fusion_details.get("photo_span_days"),
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
            "monitoring_ready": detail.get("monitoring_ready"),
            "monitoring_gate": detail.get("monitoring_gate"),
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


def render_integrity_fusion_csv(payload: dict[str, Any]) -> bytes:
    """Flatten per-tree integrity fusion export as auditor-friendly CSV."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["# integrity_fusion_export", payload.get("export_version", "")])
    writer.writerow(["# project_code", payload.get("project_code", "")])
    writer.writerow(["# generated_at", payload.get("generated_at", "")])
    summary = payload.get("summary") or {}
    writer.writerow(["# tree_count", summary.get("tree_count", "")])
    writer.writerow(["# credit_eligible_count", summary.get("credit_eligible_count", "")])
    writer.writerow(["# audit_ready_count", summary.get("audit_ready_count", "")])
    gates = payload.get("gates") or {}
    writer.writerow(["# verified_ready", gates.get("verified_ready", "")])
    writer.writerow(["# issued_ready", gates.get("issued_ready", "")])
    writer.writerow(["# monitoring_ready", gates.get("monitoring_ready", "")])
    writer.writerow([])
    writer.writerow(TREE_CSV_COLUMNS)
    for row in payload.get("trees") or []:
        blockers = row.get("audit_ready_blockers") or []
        writer.writerow(
            [
                row.get("public_code", ""),
                row.get("verification_status", ""),
                row.get("fusion_score", ""),
                row.get("field_score", ""),
                row.get("satellite_score", ""),
                row.get("composite_risk", ""),
                row.get("credit_eligible", ""),
                row.get("gps_photo_match", ""),
                row.get("duplicate_photo", ""),
                row.get("duplicate_coordinate", ""),
                row.get("ai_confidence_low", ""),
                row.get("regeotag_mismatch", ""),
                row.get("photo_span_days", ""),
                ";".join(str(item) for item in blockers),
            ]
        )
    return buf.getvalue().encode("utf-8")


def render_integrity_fusion_export(
    payload: dict[str, Any],
    *,
    export_format: str = "json",
) -> tuple[bytes, str, str]:
    """Return body bytes, media type, and file extension for json or csv."""
    if export_format == "csv":
        return (
            render_integrity_fusion_csv(payload),
            "text/csv",
            "csv",
        )
    body = json.dumps(payload, indent=2, default=str).encode("utf-8")
    return body, "application/json", "json"
