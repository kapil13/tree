"""Evidence bundle signing and verification endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.evidence.signing import public_key_material, verify_evidence_zip

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.get("/signing-key")
async def get_evidence_signing_key() -> dict[str, str]:
    key_id, public_key_b64 = public_key_material()
    return {
        "key_id": key_id,
        "algorithm": "Ed25519",
        "public_key_b64": public_key_b64,
        "signature_version": "byot-evidence-signature-1.0.0",
    }


@router.post("/verify")
async def verify_evidence_bundle(
    bundle: UploadFile = File(...),
    signature_json: UploadFile | None = File(None),
) -> dict[str, object]:
    zip_bytes = await bundle.read()
    if not zip_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="empty_bundle")

    signature_b64: str | None = None
    public_key_b64: str | None = None
    expected_sha256: str | None = None

    if signature_json is not None:
        try:
            meta = json.loads(await signature_json.read())
        except json.JSONDecodeError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_signature_json") from exc
        signature_b64 = meta.get("signature_b64")
        public_key_b64 = meta.get("public_key_b64")
        expected_sha256 = meta.get("zip_sha256")
    else:
        _, public_key_b64 = public_key_material()

    if not signature_b64:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="signature_required")

    result = verify_evidence_zip(
        zip_bytes,
        signature_b64=signature_b64,
        public_key_b64=public_key_b64,
        expected_sha256=expected_sha256,
    )
    return result
