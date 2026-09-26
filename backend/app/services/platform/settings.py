"""Read-only platform configuration snapshot for operators."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.auth.msg91_sender import sms_auth_configured
from app.services.payments.razorpay_client import payments_enabled
from app.services.satellite.bhoonidhi_client import has_bhoonidhi_credentials
from app.services.satellite.plantation import has_sentinel_credentials


def build_platform_settings() -> dict[str, Any]:
    return {
        "app_env": settings.app_env,
        "app_version": settings.app_version,
        "payments_enabled": payments_enabled(),
        "captcha_enabled": settings.captcha_enabled,
        "sms_auth_configured": sms_auth_configured(),
        "google_oauth_configured": bool(settings.google_client_id),
        "razorpay_configured": payments_enabled(),
        "sentinel_configured": has_sentinel_credentials(),
        "bhoonidhi_configured": has_bhoonidhi_credentials(),
        "bioacoustic_pipeline": settings.bioacoustic_pipeline,
        "bioacoustic_perch_enabled": settings.bioacoustic_enable_perch,
        "iucn_configured": bool(settings.iucn_api_token),
    }
