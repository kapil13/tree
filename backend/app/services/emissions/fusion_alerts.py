"""Create inbox alerts when TROPOMI / dispersion fusion needs human follow-up."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.alerts.interpreter import STRONG_METHANE_ANOMALY_PPB, interpret_emission_fusion
from app.services.emissions.fusion import EmissionFusionResult
from app.services.monitoring.alert_engine import create_monitoring_alert

PREFS_KEY = "monitoring"


async def maybe_alert_emission_fusion(
    db: AsyncSession,
    *,
    user: User,
    project_id: uuid.UUID,
    work_area_id: uuid.UUID,
    work_area_name: str,
    result: EmissionFusionResult,
) -> int:
    """Emit deduplicated alerts for misaligned or strong methane anomalies."""
    anomaly = result.anomaly_ppb or 0.0
    should_alert = result.verdict == "misaligned" or (
        result.verdict in ("consistent", "uncertain") and anomaly >= STRONG_METHANE_ANOMALY_PPB
    )
    if not should_alert:
        return 0

    kind = "emission_fusion_misaligned" if result.verdict == "misaligned" else "emission_anomaly_detected"
    severity = "high" if result.verdict == "misaligned" else "warning"

    brief = interpret_emission_fusion(
        verdict=result.verdict,
        anomaly_ppb=anomaly,
        alignment_score=result.alignment_score,
        work_area_name=work_area_name,
    )

    payload: dict[str, Any] = {
        "project_id": str(project_id),
        "work_area_id": str(work_area_id),
        "fence_id": str(work_area_id),
        "work_area_name": work_area_name,
        "verdict": result.verdict,
        "alignment_score": result.alignment_score,
        "anomaly_ppb": anomaly,
        "gas_type": "CH4",
        "deep_link": f"/projects/{project_id}?tab=emissions",
        "action_label": "Review emissions fusion",
        "interpretation": brief,
    }

    alert = await create_monitoring_alert(
        db,
        user=user,
        kind=kind,
        severity=severity,
        title=brief["headline"],
        message=brief["meaning"],
        payload=payload,
        prefs_key=PREFS_KEY,
        dedupe_hours=168,
        dedupe_keys=("work_area_id", "kind"),
    )
    return 1 if alert else 0
