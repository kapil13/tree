"""Deep-link helpers for hazard (fire, flood, locust) monitoring alerts."""

from __future__ import annotations

from typing import Any


def enrich_hazard_alert_payload(
    payload_base: dict[str, Any],
    *,
    kind: str,
) -> dict[str, Any]:
    """Add web/mobile navigation targets for hazard alert channels."""
    payload = dict(payload_base)
    fence_id = payload.get("fence_id")
    project_id = payload.get("project_id")

    if fence_id:
        payload["deep_link"] = f"/satellite?fence={fence_id}"
        payload["mobile_deep_link"] = f"/map?fence={fence_id}"
        if kind == "fire_alert":
            payload["action_label"] = "View fire detections on map"
        elif kind == "flood_extent_alert":
            payload["action_label"] = "Review flood extent on satellite map"
        elif kind == "locust_watch":
            payload["action_label"] = "Review locust watch on map"
        else:
            payload["action_label"] = "Review hazard on satellite map"
    elif project_id:
        payload["deep_link"] = f"/projects/{project_id}?tab=threats"
        payload["mobile_deep_link"] = f"/monitoring?project={project_id}"
        payload["action_label"] = "Open project threat watch"

    payload["hazard_kind"] = kind
    return payload


def hazard_push_data(payload: dict[str, Any], *, alert_id: str | None = None) -> dict[str, Any]:
    """FCM data payload for hazard alert deep links."""
    data: dict[str, Any] = {
        "type": "hazard_alert",
        "kind": str(payload.get("hazard_kind") or ""),
    }
    if alert_id:
        data["alert_id"] = alert_id
    if payload.get("fence_id"):
        data["fence_id"] = str(payload["fence_id"])
    if payload.get("mobile_deep_link"):
        data["deep_link"] = str(payload["mobile_deep_link"])
    elif payload.get("deep_link"):
        data["deep_link"] = str(payload["deep_link"])
    return data
