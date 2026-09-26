"""Deep-link helpers for SAR monitoring alerts."""

from __future__ import annotations

import uuid
from typing import Any


def enrich_sar_alert_payload(payload_base: dict[str, Any]) -> dict[str, Any]:
    """Add web/mobile navigation targets for supervisor and field apps."""
    payload = dict(payload_base)
    fence_id = payload.get("fence_id")
    tree_id = payload.get("tree_id")
    project_id = payload.get("project_id")

    if fence_id:
        payload["deep_link"] = f"/satellite?fence={fence_id}"
        payload["mobile_deep_link"] = f"/monitoring?fence={fence_id}"
        payload["action_label"] = "Review SAR on satellite map"
    elif tree_id:
        payload["deep_link"] = f"/trees/{tree_id}"
        payload["mobile_deep_link"] = f"/trees/{tree_id}"
        payload["action_label"] = "Open tree detail"
    elif project_id:
        payload["deep_link"] = f"/projects/{project_id}"
        payload["mobile_deep_link"] = f"/projects/{project_id}"
        payload["action_label"] = "Open project"

    payload["source"] = "sar_monitoring"
    return payload


def parse_uuid(value: str | uuid.UUID | None) -> uuid.UUID | None:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None
