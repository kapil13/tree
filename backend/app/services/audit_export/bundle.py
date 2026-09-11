"""Signed zip evidence bundle for Estate Watch audit engagements."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.planting_project import PlantingProject
from app.services.audit_export.context import EXPORT_VERSION, build_audit_engagement_context
from app.services.audit_export.field_verification import build_field_verification_pack
from app.services.audit_export.pdf import render_audit_engagement_pdf
from app.services.audit_export.reconciliation import build_confidence_field_reconciliation
from app.services.evidence.signing import EvidenceSignature, sign_evidence_zip, zip_content_hash

README = """Aranyix Estate Watch — Audit Evidence Bundle
=============================================

This archive contains audit-ready evidence from the Estate Watch audit engine
(intake, satellite timeline, confidence map, risk queue, field sampling).

Contents:
- manifest.json                              SHA-256 hashes for every file
- audit-context.json                         Full structured audit context
- claim-snapshot.json                        Latest frozen claim register (if present)
- confidence-map.json                        Per-block confidence grades
- confidence-vs-field-reconciliation.json  Satellite confidence vs field visit alignment
- risk-queue.json                            Auditor priority queue and anomalies
- sampling-plan.json                         Field plots and visit outcomes
- satellite-timeline.json                      T0 baseline and temporal NDVI phases
- boundaries.geojson                         Audit block polygons
- field-verification/field-visits.json       Full field visit history
- field-verification/field-visits-summary.csv  Verifier-friendly visit table
- field-verification/field-verification-map.pdf Plot outcomes summary
- field-verification/photos/                 On-site visit photos
- audit-report.pdf                           Human-readable summary report
- signature.json                             Ed25519 signature (hash excludes this file)

DISCLAIMER: Supports audit preparation only — not certification or fraud findings.
"""


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _add_file(
    zf: zipfile.ZipFile,
    path: str,
    data: bytes,
    manifest: list[dict[str, Any]],
) -> None:
    zf.writestr(path, data)
    manifest.append({"path": path, "sha256": _sha256(data), "size_bytes": len(data)})


async def build_audit_engagement_bundle(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
    *,
    sign: bool = True,
) -> tuple[bytes, dict[str, Any], EvidenceSignature | None]:
    if engagement.status not in {"field_verified", "export_ready"}:
        raise ValueError("field_verification_incomplete")

    ctx = await build_audit_engagement_context(db, engagement, project)
    field_pack = await build_field_verification_pack(db, engagement.id)
    reconciliation = await build_confidence_field_reconciliation(db, engagement.id)
    manifest_files: list[dict[str, Any]] = []
    buf = io.BytesIO()

    intake = ctx.get("intake") or {}
    snapshot = intake.get("latest_snapshot")

    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        _add_file(zf, "README.txt", README.encode("utf-8"), manifest_files)
        _add_file(
            zf,
            "audit-context.json",
            json.dumps(ctx, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        if snapshot:
            _add_file(
                zf,
                "claim-snapshot.json",
                json.dumps(snapshot, indent=2, default=str).encode("utf-8"),
                manifest_files,
            )
        _add_file(
            zf,
            "confidence-map.json",
            json.dumps(ctx.get("confidence") or {}, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "confidence-vs-field-reconciliation.json",
            json.dumps(reconciliation, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "risk-queue.json",
            json.dumps(ctx.get("risk") or {}, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "sampling-plan.json",
            json.dumps(ctx.get("sampling") or {}, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "satellite-timeline.json",
            json.dumps(ctx.get("satellite") or {}, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        for path, data in sorted(field_pack.items()):
            _add_file(zf, path, data, manifest_files)

        pdf = render_audit_engagement_pdf(ctx)
        _add_file(zf, "audit-report.pdf", pdf, manifest_files)

        bundle_manifest = {
            "bundle_version": EXPORT_VERSION,
            "engagement_id": str(engagement.id),
            "project_id": str(project.id),
            "project_code": project.code,
            "generated_at": datetime.now(UTC).isoformat(),
            "file_count": len(manifest_files),
            "files": manifest_files,
        }
        _add_file(
            zf,
            "manifest.json",
            json.dumps(bundle_manifest, indent=2).encode("utf-8"),
            manifest_files,
        )

    zip_bytes_unsigned = buf.getvalue()
    signature = sign_evidence_zip(zip_bytes_unsigned) if sign else None

    if signature is not None:
        sig_buf = io.BytesIO(zip_bytes_unsigned)
        with zipfile.ZipFile(sig_buf, mode="a", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(
                "signature.json",
                json.dumps(signature.to_dict(), indent=2).encode("utf-8"),
            )
        zip_bytes = sig_buf.getvalue()
    else:
        zip_bytes = zip_bytes_unsigned

    bundle_sha256 = zip_content_hash(zip_bytes_unsigned)

    engagement.status = "export_ready"
    meta = dict(engagement.metadata_ or {})
    meta["exported_at"] = datetime.now(UTC).isoformat()
    meta["export_bundle_sha256"] = bundle_sha256
    meta["export_zip_size_bytes"] = len(zip_bytes)
    meta["export_file_count"] = len(manifest_files)
    if signature is not None:
        meta["export_signature_key_id"] = signature.key_id
    engagement.metadata_ = meta

    summary = {
        "engagement_id": str(engagement.id),
        "project_id": str(project.id),
        "project_code": project.code,
        "file_count": len(manifest_files),
        "bundle_sha256": bundle_sha256,
        "zip_size_bytes": len(zip_bytes),
        "signed": signature is not None,
        "signature_key_id": signature.key_id if signature else None,
        "status": engagement.status,
    }
    return zip_bytes, summary, signature
