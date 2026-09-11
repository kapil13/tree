"""Bridge integrity fusion gates into Estate Watch audit readiness."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.planting_project import PlantingProject
from app.services.audit_export.readiness import export_readiness
from app.services.integrity.credit_gating import ISSUED_MIN_AUDIT_READY_PCT, integrity_gate_detail


async def build_audit_integrity_bridge(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
) -> dict[str, Any]:
    integrity = await integrity_gate_detail(db, project.id)
    export = await export_readiness(db, engagement)

    audit_ready_pct = float(integrity.get("audit_ready_pct") or 0.0)
    blocking_trees = list(integrity.get("blocking_trees") or [])
    integrity_gate_passed = audit_ready_pct >= ISSUED_MIN_AUDIT_READY_PCT

    recommendations: list[str] = []
    if not integrity_gate_passed:
        recommendations.append(
            f"Raise audit-ready tree coverage to at least {ISSUED_MIN_AUDIT_READY_PCT:.0f}% "
            f"(currently {audit_ready_pct:.1f}%)."
        )
    if blocking_trees:
        recommendations.append(
            f"Resolve integrity blockers on {len(blocking_trees)} tree(s) before export."
        )
    if not export.get("ready"):
        unmet = [s["label"] for s in export.get("sections", []) if not s.get("met")]
        if unmet:
            recommendations.append(f"Complete audit pipeline sections: {', '.join(unmet)}.")

    message = (
        "Integrity and audit export gates are aligned."
        if integrity_gate_passed and export.get("ready")
        else "Resolve integrity fusion blockers and audit pipeline gaps before attestation."
    )

    return {
        "engagement_id": str(engagement.id),
        "project_id": str(project.id),
        "tree_count": int(integrity.get("tree_count") or 0),
        "audit_ready_count": int(integrity.get("audit_ready_count") or 0),
        "audit_ready_pct": audit_ready_pct,
        "blocking_count": len(blocking_trees),
        "blocking_trees": blocking_trees[:10],
        "export_ready": bool(export.get("ready")),
        "export_exportable": bool(export.get("exportable")),
        "export_sections": export.get("sections", []),
        "integrity_gate_passed": integrity_gate_passed,
        "recommendations": recommendations,
        "message": message,
    }
