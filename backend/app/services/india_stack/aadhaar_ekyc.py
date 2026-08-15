"""Aadhaar e-KYC adapter for field-staff onboarding (stub by default)."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any, Literal

from app.core.config import settings

Provider = Literal["stub", "uidai"]


def aadhaar_ekyc_status() -> dict[str, Any]:
    provider: Provider = settings.aadhaar_ekyc_provider  # type: ignore[assignment]
    configured = settings.aadhaar_ekyc_enabled and provider != "stub"
    return {
        "enabled": settings.aadhaar_ekyc_enabled,
        "provider": provider,
        "configured": configured,
        "stub_mode": provider == "stub" or not configured,
    }


async def initiate_ekyc(
    *,
    aadhaar_last4: str,
    full_name: str,
    consent: bool,
) -> dict[str, Any]:
    if not settings.aadhaar_ekyc_enabled:
        return {"status": "disabled", "verified": False, "reason": "aadhaar_ekyc_disabled"}

    if not consent:
        return {"status": "rejected", "verified": False, "reason": "consent_required"}

    if len(aadhaar_last4) != 4 or not aadhaar_last4.isdigit():
        return {"status": "rejected", "verified": False, "reason": "invalid_aadhaar_last4"}

    provider: Provider = settings.aadhaar_ekyc_provider  # type: ignore[assignment]
    if provider == "stub":
        token = hashlib.sha256(f"{full_name}:{aadhaar_last4}".encode()).hexdigest()[:20]
        return {
            "status": "verified",
            "verified": True,
            "ekyc_ref": f"EKYC-STUB-{token.upper()}",
            "provider": "stub",
            "name_match": "partial",
            "verified_at": datetime.now(UTC).isoformat(),
            "stub": True,
            "message": "Stub e-KYC — set AADHAAR_EKYC_PROVIDER=uidai with licensed ASP for production.",
        }

    return {
        "status": "pending",
        "verified": False,
        "provider": provider,
        "reason": "live_uidai_not_implemented",
        "stub": False,
    }
