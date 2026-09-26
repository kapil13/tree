"""Export package signature verification (Wave D / P12)."""

from __future__ import annotations

import json
import uuid
import zipfile
from datetime import UTC, datetime
from io import BytesIO
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_export_artifact import AuditExportVerification
from app.models.audit_export_entity import AuditExport
from app.services.audit_export.artifacts import get_export_artifact_bytes
from app.services.evidence.signing import verify_evidence_zip, zip_content_hash


def _unsigned_zip_bytes(zip_bytes: bytes) -> bytes:
    """Strip signature.json from signed zip to recover unsigned payload."""
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        if "signature.json" not in zf.namelist():
            return zip_bytes
        out = BytesIO()
        with zipfile.ZipFile(out, mode="w", compression=zipfile.ZIP_DEFLATED) as out_zip:
            for name in zf.namelist():
                if name == "signature.json":
                    continue
                out_zip.writestr(name, zf.read(name))
        return out.getvalue()


async def verify_frozen_export(
    db: AsyncSession,
    *,
    export: AuditExport,
    verified_by_user_id: uuid.UUID | None = None,
) -> AuditExportVerification:
    zip_bytes = await get_export_artifact_bytes(db, export_id=export.id)
    details: dict[str, Any] = {
        "export_id": str(export.id),
        "package_sha256": export.package_sha256,
    }

    if zip_bytes is None:
        details["error"] = "artifact_not_found"
        row = AuditExportVerification(
            export_id=export.id,
            valid=False,
            verified_at=datetime.now(UTC),
            verified_by_user_id=verified_by_user_id,
            details=details,
        )
        db.add(row)
        await db.flush()
        return row

    unsigned = _unsigned_zip_bytes(zip_bytes)
    details["unsigned_bundle_hash"] = zip_content_hash(unsigned)
    details["hash_match"] = details["unsigned_bundle_hash"] == export.unsigned_bundle_hash

    valid = bool(details["hash_match"])
    sig_payload = export.signature_json
    if sig_payload is None and "signature.json" in zipfile.ZipFile(BytesIO(zip_bytes)).namelist():
        sig_payload = json.loads(
            zipfile.ZipFile(BytesIO(zip_bytes)).read("signature.json").decode("utf-8")
        )

    if sig_payload:
        try:
            sig_result = verify_evidence_zip(
                unsigned,
                signature_b64=sig_payload["signature_b64"],
                public_key_b64=sig_payload.get("public_key_b64"),
                expected_sha256=sig_payload.get("zip_sha256"),
            )
            details["signature_result"] = sig_result
            valid = valid and bool(sig_result.get("valid"))
        except Exception as exc:
            details["signature_valid"] = False
            details["signature_error"] = str(exc)
            valid = False
    else:
        details["signature_valid"] = None

    row = AuditExportVerification(
        export_id=export.id,
        valid=valid,
        verified_at=datetime.now(UTC),
        verified_by_user_id=verified_by_user_id,
        details=details,
    )
    db.add(row)
    await db.flush()
    return row
