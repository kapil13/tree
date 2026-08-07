"""SAR fusion outcome alerts — Phase 3 operational monitoring."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.monitoring.alert_engine import create_monitoring_alert

INTEGRITY_DROP_THRESHOLD = 15.0
INTEGRITY_AT_RISK_THRESHOLD = 50.0
STALE_SAR_DAYS = 35


def fusion_from_metadata(meta: dict[str, Any] | None) -> dict[str, Any] | None:
    if not meta:
        return None
    fusion = meta.get("sar_fusion")
    if isinstance(fusion, dict) and fusion.get("forest_integrity_score") is not None:
        return fusion
    return None


async def maybe_alert_sar_fusion(
    db: AsyncSession,
    *,
    user: User | None,
    fusion: dict[str, Any],
    payload_base: dict[str, Any],
    title_prefix: str,
    previous_fusion: dict[str, Any] | None = None,
) -> int:
    """Raise deduplicated alerts from fusion outcomes. Returns alert count created."""
    if user is None or not fusion:
        return 0

    created = 0
    score = float(fusion.get("forest_integrity_score") or 0)
    mode = str(fusion.get("monitoring_mode") or "")
    grade = str(fusion.get("integrity_grade") or "")
    summary = str(fusion.get("summary") or "")
    sar_analysis = fusion.get("sar_analysis") or {}
    risk_level = str(sar_analysis.get("risk_level") or "low")

    prev_score: float | None = None
    if previous_fusion and previous_fusion.get("forest_integrity_score") is not None:
        prev_score = float(previous_fusion["forest_integrity_score"])

    if prev_score is not None and score <= prev_score - INTEGRITY_DROP_THRESHOLD:
        drop = round(prev_score - score, 1)
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="sar_integrity_drop",
            severity="high",
            title=f"Forest Integrity dropped — {title_prefix}",
            message=(
                f"Forest Integrity fell from {prev_score:.0f} to {score:.0f} "
                f"({drop:.0f} pt drop). {summary}"
            ),
            payload={
                **payload_base,
                "alert_reason": "integrity_drop",
                "forest_integrity_score": score,
                "previous_integrity_score": prev_score,
                "monitoring_mode": mode,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=("fence_id", "tree_id", "alert_reason"),
        )
        if alert:
            created += 1

    if mode == "optical_sar_divergent":
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="sar_optical_divergent",
            severity="high",
            title=f"Canopy vs ground mismatch — {title_prefix}",
            message=summary or "Optical NDVI looks healthy but SAR detects ground moisture risk.",
            payload={
                **payload_base,
                "alert_reason": "optical_sar_divergent",
                "forest_integrity_score": score,
                "monitoring_mode": mode,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=("fence_id", "tree_id", "alert_reason"),
        )
        if alert:
            created += 1

    if grade in {"at_risk", "critical"} or score < INTEGRITY_AT_RISK_THRESHOLD:
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="sar_integrity_at_risk",
            severity="high" if grade == "critical" else "moderate",
            title=f"Forest Integrity at risk — {title_prefix}",
            message=summary or f"Forest Integrity {score:.0f}/100 ({grade}).",
            payload={
                **payload_base,
                "alert_reason": "integrity_at_risk",
                "forest_integrity_score": score,
                "integrity_grade": grade,
                "monitoring_mode": mode,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=("fence_id", "tree_id", "alert_reason"),
        )
        if alert:
            created += 1

    if mode == "sar_gap_fill" and risk_level != "low":
        alert = await create_monitoring_alert(
            db,
            user=user,
            kind="sar_monsoon_gap_fill",
            severity="moderate" if risk_level == "moderate" else "high",
            title=f"SAR monsoon gap-fill alert — {title_prefix}",
            message=summary or "Optical NDVI stale; SAR ground layer reports stress.",
            payload={
                **payload_base,
                "alert_reason": "monsoon_gap_fill",
                "forest_integrity_score": score,
                "monitoring_mode": mode,
                "risk_level": risk_level,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=("fence_id", "tree_id", "alert_reason"),
        )
        if alert:
            created += 1

    return created
