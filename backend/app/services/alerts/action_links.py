"""Standardized navigation fields for alert inbox items."""

from __future__ import annotations

import uuid
from typing import Any


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def alert_action_fields(
    *,
    kind: str,
    tree_id: uuid.UUID | None,
    payload: dict[str, Any] | None,
) -> dict[str, str | None]:
    """Derive entity_id, entity_type, recommended_action, and deep_link for clients."""
    data = dict(payload or {})
    entity_id: str | None = None
    entity_type: str | None = None
    deep_link = _as_str(data.get("deep_link"))
    recommended_action = _as_str(data.get("action_label"))

    fence_id = _as_str(data.get("fence_id") or data.get("work_area_id"))
    project_id = _as_str(data.get("project_id"))
    payload_tree_id = _as_str(data.get("tree_id"))
    alert_tree_id = str(tree_id) if tree_id else None
    resolved_tree_id = alert_tree_id or payload_tree_id

    if fence_id:
        entity_type = "work_area"
        entity_id = fence_id
        deep_link = deep_link or f"/satellite?fence={fence_id}"
        recommended_action = recommended_action or "Review satellite monitoring"
    elif resolved_tree_id:
        entity_type = "tree"
        entity_id = resolved_tree_id
        deep_link = deep_link or f"/trees/{resolved_tree_id}"
        if kind.startswith("survival") or "survey" in kind:
            recommended_action = recommended_action or "Complete survival survey"
        elif kind.startswith("sar_"):
            recommended_action = recommended_action or "Review SAR integrity"
        else:
            recommended_action = recommended_action or "Open tree detail"
    elif project_id:
        entity_type = "project"
        entity_id = project_id
        deep_link = deep_link or f"/projects/{project_id}"
        if kind == "compliance_open" or "compliance" in kind:
            deep_link = f"/projects/{project_id}?tab=compliance"
            recommended_action = recommended_action or "Resolve compliance issue"
        else:
            recommended_action = recommended_action or "Open project"

    if not recommended_action:
        if kind.startswith("weather_"):
            recommended_action = "Review weather preparedness"
        elif kind.startswith("pest_intel"):
            recommended_action = "Scout affected rows"
        elif kind in ("fire_alert", "flood_extent_alert", "locust_watch"):
            recommended_action = "Review field preparedness"
        elif kind.startswith("emission_"):
            recommended_action = "Review emissions anomaly"
        elif kind.startswith("satellite_health"):
            recommended_action = "Review canopy health"
        else:
            recommended_action = "Review alert details"

    return {
        "entity_id": entity_id,
        "entity_type": entity_type,
        "recommended_action": recommended_action,
        "deep_link": deep_link,
    }
