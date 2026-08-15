"""DigiLocker land-record verification adapter (stub + OAuth hook)."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings


def digilocker_status() -> dict[str, Any]:
    configured = bool(settings.digilocker_enabled and settings.digilocker_client_id)
    return {
        "enabled": settings.digilocker_enabled,
        "configured": configured,
        "stub_mode": settings.digilocker_stub_mode or not configured,
        "issuer": "in.gov.digilocker",
    }


async def verify_land_record(
    *,
    document_uri: str | None = None,
    aadhaar_last4: str | None = None,
    land_record_number: str | None = None,
) -> dict[str, Any]:
    """Verify a land record via DigiLocker (stub returns synthetic verification)."""
    if not settings.digilocker_enabled:
        return {
            "verified": False,
            "reason": "digilocker_disabled",
            "stub": True,
        }

    if not (document_uri or land_record_number):
        return {
            "verified": False,
            "reason": "document_reference_required",
            "stub": settings.digilocker_stub_mode,
        }

    ref = document_uri or land_record_number or ""
    if settings.digilocker_stub_mode or not settings.digilocker_client_id:
        token = hashlib.sha256(ref.encode()).hexdigest()[:24]
        return {
            "verified": True,
            "verification_id": f"DL-STUB-{token.upper()}",
            "document_uri": document_uri,
            "land_record_number": land_record_number,
            "aadhaar_last4": aadhaar_last4,
            "issuer": "in.gov.digilocker",
            "verified_at": datetime.now(UTC).isoformat(),
            "stub": True,
            "message": "Stub verification — configure DIGILOCKER_CLIENT_ID for live OAuth.",
        }

    # Live OAuth flow placeholder — production teams wire redirect + token exchange.
    return {
        "verified": False,
        "reason": "live_oauth_not_implemented",
        "oauth_authorize_url": f"https://api.digitallocker.gov.in/public/oauth2/1/authorize?client_id={settings.digilocker_client_id}&state={uuid.uuid4()}",
        "stub": False,
    }
