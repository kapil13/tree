"""Nutri-garden outcome tracking (beneficiary reach and harvest logs)."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

MAX_HARVEST_LOGS = 24
VALID_SEASONS = frozenset({"kharif", "rabi", "summer", "annual"})


def _outcomes(metadata: dict[str, Any]) -> dict[str, Any]:
    raw = metadata.get("nutri_garden_outcomes")
    return dict(raw) if isinstance(raw, dict) else {}


def validate_harvest_log(entry: dict[str, Any]) -> dict[str, Any]:
    season = str(entry.get("season", "")).strip().lower()
    if season not in VALID_SEASONS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_harvest_season")
    try:
        fruit_kg = float(entry["fruit_kg"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_fruit_kg") from exc
    if fruit_kg < 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_fruit_kg")

    normalized: dict[str, Any] = {
        "season": season,
        "fruit_kg": round(fruit_kg, 2),
    }
    if entry.get("harvest_month"):
        normalized["harvest_month"] = str(entry["harvest_month"]).strip()
    if entry.get("notes"):
        normalized["notes"] = str(entry["notes"]).strip()[:500]
    return normalized


def merge_nutri_outcomes(
    metadata: dict[str, Any],
    *,
    beneficiary_households: int | None = None,
    harvest_log: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged = dict(metadata)
    outcomes = _outcomes(merged)
    if beneficiary_households is not None:
        if beneficiary_households < 0:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_beneficiary_households")
        outcomes["beneficiary_households"] = beneficiary_households
    if harvest_log is not None:
        logs = list(outcomes.get("harvest_logs") or [])
        logs.append(validate_harvest_log(harvest_log))
        outcomes["harvest_logs"] = logs[-MAX_HARVEST_LOGS:]
    merged["nutri_garden_outcomes"] = outcomes
    return merged


def nutri_outcome_summary(metadata: dict[str, Any]) -> dict[str, Any]:
    outcomes = _outcomes(metadata)
    refs = metadata.get("scheme_refs") if isinstance(metadata.get("scheme_refs"), dict) else {}
    logs = outcomes.get("harvest_logs") or []
    total_kg = sum(float(log.get("fruit_kg") or 0) for log in logs if isinstance(log, dict))
    households = outcomes.get("beneficiary_households")
    if households is None and refs.get("beneficiary_households") is not None:
        try:
            households = int(refs["beneficiary_households"])
        except (TypeError, ValueError):
            households = None
    return {
        "beneficiary_households": households,
        "harvest_log_count": len(logs),
        "total_harvest_kg": round(total_kg, 2) if logs else None,
        "last_harvest_season": logs[-1].get("season") if logs else None,
    }
