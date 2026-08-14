"""Ed25519 detached signatures for evidence bundles."""

from __future__ import annotations

import base64
import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.core.config import settings
from app.services.evidence.tsa import request_timestamp_token

SIGNATURE_VERSION = "byot-evidence-signature-1.0.0"


@dataclass(frozen=True)
class EvidenceSignature:
    key_id: str
    zip_sha256: str
    signature_b64: str
    public_key_b64: str
    signed_at: str
    tsa_token_b64: str | None
    signature_version: str = SIGNATURE_VERSION

    def to_dict(self) -> dict[str, str | None]:
        return {
            "signature_version": self.signature_version,
            "key_id": self.key_id,
            "zip_sha256": self.zip_sha256,
            "signature_b64": self.signature_b64,
            "public_key_b64": self.public_key_b64,
            "signed_at": self.signed_at,
            "tsa_token_b64": self.tsa_token_b64,
        }


def zip_content_hash(zip_bytes: bytes) -> str:
    return hashlib.sha256(zip_bytes).hexdigest()


@lru_cache
def _private_key() -> Ed25519PrivateKey:
    raw = settings.evidence_signing_key
    if raw:
        seed = base64.b64decode(raw.strip())
        return Ed25519PrivateKey.from_private_bytes(seed[:32])
    # Dev-only deterministic fallback — set EVIDENCE_SIGNING_KEY in production.
    seed = hashlib.sha256(f"byot-evidence:{settings.jwt_secret}".encode()).digest()
    return Ed25519PrivateKey.from_private_bytes(seed)


def public_key_material() -> tuple[str, str]:
    pub = _private_key().public_key()
    raw = pub.public_bytes(Encoding.Raw, PublicFormat.Raw)
    key_id = hashlib.sha256(raw).hexdigest()[:16]
    return key_id, base64.b64encode(raw).decode("ascii")


def sign_evidence_zip(zip_bytes: bytes) -> EvidenceSignature:
    key_id, public_key_b64 = public_key_material()
    digest = zip_content_hash(zip_bytes)
    signature = _private_key().sign(digest.encode())
    tsa_token = request_timestamp_token(digest)
    return EvidenceSignature(
        key_id=key_id,
        zip_sha256=digest,
        signature_b64=base64.b64encode(signature).decode("ascii"),
        public_key_b64=public_key_b64,
        signed_at=datetime.now(UTC).isoformat(),
        tsa_token_b64=base64.b64encode(tsa_token).decode("ascii") if tsa_token else None,
    )


def verify_evidence_zip(
    zip_bytes: bytes,
    *,
    signature_b64: str,
    public_key_b64: str | None = None,
    expected_sha256: str | None = None,
) -> dict[str, str | bool]:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    digest = zip_content_hash(zip_bytes)
    if expected_sha256 and digest != expected_sha256:
        return {"valid": False, "reason": "zip_sha256_mismatch", "zip_sha256": digest}

    key_b64 = public_key_b64 or public_key_material()[1]
    pub_raw = base64.b64decode(key_b64)
    pub_key = Ed25519PublicKey.from_public_bytes(pub_raw)
    sig = base64.b64decode(signature_b64)
    try:
        pub_key.verify(sig, digest.encode())
    except InvalidSignature:
        return {"valid": False, "reason": "invalid_signature", "zip_sha256": digest}
    return {"valid": True, "zip_sha256": digest}
