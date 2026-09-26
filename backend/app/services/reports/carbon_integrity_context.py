"""Cross-framework carbon integrity envelope (Phase B — leakage, permanence, Article 6)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_serial import CreditSerial
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.services.carbon.risk_ops import latest_risk_assessment
from app.services.carbon.vm0047_ops import list_leakage
from app.services.satellite.sar_service import is_sar_provider_record


async def _sar_monitoring(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any]:
    sar_scores: list[float] = []
    sar_ground_risk = 0
    sar_res = await db.execute(
        select(PlantationSatelliteRecord)
        .join(PlantationFence, PlantationFence.id == PlantationSatelliteRecord.fence_id)
        .where(PlantationFence.project_id == project_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
    )
    seen_fences: set[str] = set()
    for rec in sar_res.scalars().all():
        fid = str(rec.fence_id)
        if fid in seen_fences or not is_sar_provider_record(rec.provider):
            continue
        seen_fences.add(fid)
        fusion = (rec.raw_metadata or {}).get("sar_fusion") or {}
        score = fusion.get("forest_integrity_score")
        if score is not None:
            sar_scores.append(float(score))
        if fusion.get("integrity_grade") in {"at_risk", "critical"}:
            sar_ground_risk += 1

    avg = round(sum(sar_scores) / len(sar_scores), 1) if sar_scores else None
    return {
        "sar_work_areas_scanned": len(sar_scores),
        "sar_avg_forest_integrity": avg,
        "sar_ground_risk_sites": sar_ground_risk,
    }


async def _article6_serials(db: AsyncSession, project_id: uuid.UUID) -> list[dict[str, Any]]:
    res = await db.execute(
        select(CreditSerial)
        .where(CreditSerial.project_id == project_id)
        .order_by(CreditSerial.created_at.desc())
    )
    rows = list(res.scalars().all())
    return [
        {
            "serial_number": s.serial_number,
            "status": s.status,
            "vintage_year": s.vintage_year,
            "tco2e_amount": float(s.tco2e_amount),
            "paris_article6": s.paris_article6,
            "corresponding_adjustment_ref": s.corresponding_adjustment_ref,
            "beneficiary": s.beneficiary,
            "retired_at": s.retired_at.isoformat() if s.retired_at else None,
        }
        for s in rows
    ]


async def build_carbon_integrity_envelope(
    db: AsyncSession,
    project: PlantingProject,
) -> dict[str, Any]:
    """Aggregate leakage, NPRT, SAR, violations, and Article 6 serial metadata."""
    leakage_rows = await list_leakage(db, project.id)
    total_leakage = sum(r["net_leakage_tco2e"] for r in leakage_rows)
    risk = await latest_risk_assessment(db, project.id)
    sar = await _sar_monitoring(db, project.id)
    serials = await _article6_serials(db, project.id)

    open_violations_res = await db.execute(
        select(PlantingComplianceViolation).where(
            PlantingComplianceViolation.project_id == project.id,
            PlantingComplianceViolation.resolved_at.is_(None),
        )
    )
    open_violations = list(open_violations_res.scalars().all())

    refs = (getattr(project, "metadata_", None) or {}).get("scheme_refs") or {}
    meta = getattr(project, "metadata_", None) or {}
    auth_ref = refs.get("article6_authorization_ref") or meta.get("article6_authorization_ref")

    art6_serials = [s for s in serials if s["paris_article6"]]
    ca_refs = [s["corresponding_adjustment_ref"] for s in serials if s["corresponding_adjustment_ref"]]

    return {
        "leakage": {
            "entries": leakage_rows,
            "entry_count": len(leakage_rows),
            "total_net_leakage_tco2e": round(total_leakage, 4),
        },
        "permanence": {
            "nprt_score": risk.nprt_score if risk else None,
            "buffer_pct": float(risk.buffer_pct) if risk else None,
            "nprt_assessed_at": risk.assessed_at.isoformat() if risk else None,
            "open_violations": len(open_violations),
            **sar,
        },
        "article6": {
            "authorization_ref": auth_ref,
            "serial_count": len(serials),
            "article6_serial_count": len(art6_serials),
            "retired_article6_count": sum(
                1 for s in art6_serials if s["status"] == "retired"
            ),
            "corresponding_adjustment_refs": ca_refs,
            "serials": serials,
        },
    }
