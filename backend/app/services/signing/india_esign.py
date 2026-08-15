"""India Stack e-Sign / DSC adapter for verifier attestations and evidence bundles.

Production: wire to CCA-licensed ASP (e.g. NSDL, eMudhra) via ``india_esign_api_url``.
Development: deterministic stub signatures when credentials are absent.
"""

from __future__ import annotations

import base64
import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("signing.india_esign")

ESIGN_VERSION = "byot-india-esign-1.0.0"


@dataclass(frozen=True)
class IndiaESignResult:
    esign_ref: str
    document_hash: str
    signature_b64: str
    signer_name: str | None
    signed_at: str
    provider: str
    stub: bool
    raw_response: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "esign_version": ESIGN_VERSION,
            "esign_ref": self.esign_ref,
            "document_hash": self.document_hash,
            "signature_b64": self.signature_b64,
            "signer_name": self.signer_name,
            "signed_at": self.signed_at,
            "provider": self.provider,
            "stub": self.stub,
        }


def document_hash(payload: bytes | str) -> str:
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _stub_sign(document_sha256: str, *, signer_name: str | None, purpose: str) -> IndiaESignResult:
    seed = f"{settings.jwt_secret}:{document_sha256}:{purpose}".encode()
    sig = hashlib.sha256(seed).digest()
    ref = f"STUB-ESIGN-{hashlib.sha256(document_sha256.encode()).hexdigest()[:16].upper()}"
    return IndiaESignResult(
        esign_ref=ref,
        document_hash=document_sha256,
        signature_b64=base64.b64encode(sig).decode("ascii"),
        signer_name=signer_name,
        signed_at=datetime.now(UTC).isoformat(),
        provider="byot-stub",
        stub=True,
    )


async def _remote_sign(
    document_sha256: str,
    *,
    signer_name: str | None,
    purpose: str,
    metadata: dict[str, Any] | None = None,
) -> IndiaESignResult:
    url = (settings.india_esign_api_url or "").rstrip("/")
    if not url:
        raise ValueError("india_esign_api_url_missing")

    body = {
        "document_hash": document_sha256,
        "hash_algorithm": "SHA256",
        "purpose": purpose,
        "signer_name": signer_name,
        "metadata": metadata or {},
        "client_id": settings.india_esign_client_id,
    }
    headers = {"Content-Type": "application/json"}
    if settings.india_esign_client_secret:
        headers["X-Client-Secret"] = settings.india_esign_client_secret

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{url}/v1/sign", json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    return IndiaESignResult(
        esign_ref=str(data.get("esign_ref") or data.get("transaction_id") or uuid.uuid4()),
        document_hash=document_sha256,
        signature_b64=str(data.get("signature_b64") or data.get("signature") or ""),
        signer_name=data.get("signer_name") or signer_name,
        signed_at=str(data.get("signed_at") or datetime.now(UTC).isoformat()),
        provider=str(data.get("provider") or "india-esign-asp"),
        stub=False,
        raw_response=data,
    )


async def sign_document(
    payload: bytes | str,
    *,
    signer_name: str | None = None,
    purpose: str = "verifier_attestation",
    metadata: dict[str, Any] | None = None,
) -> IndiaESignResult:
    """Sign a document hash via India eSign ASP or dev stub."""
    digest = document_hash(payload)
    use_remote = (
        settings.india_esign_enabled
        and settings.india_esign_api_url
        and settings.india_esign_client_id
    )
    if not use_remote:
        return _stub_sign(digest, signer_name=signer_name, purpose=purpose)

    try:
        return await _remote_sign(
            digest, signer_name=signer_name, purpose=purpose, metadata=metadata
        )
    except Exception as exc:
        log.warning("india_esign_remote_failed", error=str(exc))
        if settings.india_esign_stub_on_failure:
            return _stub_sign(digest, signer_name=signer_name, purpose=purpose)
        raise


async def sign_attestation(
    attestation_hash: str,
    *,
    verifier_name: str | None,
    tree_public_code: str | None = None,
    sample_id: str | None = None,
) -> IndiaESignResult:
    meta = {
        "tree_public_code": tree_public_code,
        "sample_id": sample_id,
        "type": "verification_attestation",
    }
    return await sign_document(
        attestation_hash,
        signer_name=verifier_name,
        purpose="verifier_attestation",
        metadata=meta,
    )


async def sign_evidence_bundle_hash(
    bundle_sha256: str,
    *,
    signer_name: str | None,
    project_code: str | None = None,
) -> IndiaESignResult:
    meta = {"project_code": project_code, "type": "evidence_bundle"}
    return await sign_document(
        bundle_sha256,
        signer_name=signer_name,
        purpose="evidence_bundle",
        metadata=meta,
    )


def esign_status() -> dict[str, Any]:
    configured = bool(
        settings.india_esign_enabled
        and settings.india_esign_api_url
        and settings.india_esign_client_id
    )
    return {
        "enabled": settings.india_esign_enabled,
        "configured": configured,
        "provider_mode": "asp" if configured else "stub",
        "api_url": settings.india_esign_api_url,
        "stub_on_failure": settings.india_esign_stub_on_failure,
    }
