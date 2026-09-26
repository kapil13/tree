"""Block audit-ready and compliance exports when required integrations are stubbed."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.services.ai.service import ai_service_status
from app.services.monitoring.worker_health import build_bioacoustic_health
from app.services.satellite.bhoonidhi_client import has_bhoonidhi_credentials
from app.services.satellite.plantation import has_sentinel_credentials
from app.services.satellite.sar_service import has_sar_credentials
from app.services.threats.firms_client import has_firms_credentials
from app.services.threats.locust_feed import has_locust_feed


@dataclass
class IntegrationGateError(ValueError):
    code: str
    blocked: list[dict[str, Any]]

    def __init__(self, code: str, blocked: list[dict[str, Any]]) -> None:
        self.code = code
        self.blocked = blocked
        super().__init__(code)


def _row(key: str, label: str, mode: str, *, required: bool = True) -> dict[str, Any]:
    return {"key": key, "label": label, "mode": mode, "required": required}


def integration_modes() -> dict[str, str]:
    """Normalized live | stub | disabled modes for export gating."""
    ai = ai_service_status()
    bio = build_bioacoustic_health()
    optical_live = has_sentinel_credentials()
    sar_live = settings.sar_enabled and has_sar_credentials()
    bhoonidhi_live = has_bhoonidhi_credentials()
    firms_live = has_firms_credentials()
    if not settings.sar_enabled:
        sar_mode = "disabled"
    elif sar_live:
        sar_mode = "live"
    else:
        sar_mode = "stub"

    bio_mode = "live" if bio.get("production_ready") else "stub"

    locust_mode = (
        "live" if has_locust_feed() or settings.fao_locust_feed_enabled else "estimate"
    )

    return {
        "optical_ndvi": "live" if optical_live else "stub",
        "sar": sar_mode,
        "firms": "live" if firms_live else "stub",
        "locust": locust_mode,
        "ai": "live" if ai.get("mode") == "live" else "stub",
        "bioacoustic": bio_mode,
        "bhoonidhi": "live" if bhoonidhi_live else "stub",
    }


def _blocked(required_keys: list[str], modes: dict[str, str]) -> list[dict[str, Any]]:
    labels = {
        "optical_ndvi": "Optical NDVI (Sentinel Hub)",
        "sar": "SAR monitoring",
        "firms": "NASA FIRMS fire feed",
        "locust": "Locust observation feed",
        "ai": "AI analysis pipeline",
        "bioacoustic": "Bioacoustic identification",
        "bhoonidhi": "Bhoonidhi catalog",
    }
    blocked: list[dict[str, Any]] = []
    for key in required_keys:
        mode = modes.get(key, "stub")
        if mode != "live":
            blocked.append(_row(key, labels.get(key, key), mode))
    return blocked


def assert_audit_export_integrations() -> None:
    """Estate Watch audit exports require live optical + SAR providers."""
    modes = integration_modes()
    blocked = _blocked(["optical_ndvi", "sar"], modes)
    if blocked:
        raise IntegrationGateError("integration_stub_blocks_audit_export", blocked)


def assert_compliance_export_integrations() -> None:
    """Framework compliance exports require live satellite + AI when used in reports."""
    modes = integration_modes()
    blocked = _blocked(["optical_ndvi", "ai"], modes)
    if blocked:
        raise IntegrationGateError("integration_stub_blocks_compliance_export", blocked)


def integration_gate_summary() -> dict[str, Any]:
    modes = integration_modes()
    labels = {
        "optical_ndvi": "Optical NDVI",
        "sar": "SAR",
        "firms": "FIRMS",
        "locust": "Locust",
        "ai": "AI",
        "bioacoustic": "Bioacoustic",
        "bhoonidhi": "Bhoonidhi",
    }
    integrations = [
        {"key": key, "label": labels[key], "mode": modes[key]} for key in labels
    ]
    return {
        "modes": modes,
        "integrations": integrations,
        "audit_export_ready": not _blocked(["optical_ndvi", "sar"], modes),
        "compliance_export_ready": not _blocked(["optical_ndvi", "ai"], modes),
    }
