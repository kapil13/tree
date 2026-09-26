"""Audit-grade evidence bundle (zip + manifest) for planting projects."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.credits.green_credit import build_project_green_credit_summary
from app.services.evidence.signing import EvidenceSignature, sign_evidence_zip, zip_content_hash
from app.services.planting_projects.mrv_export import build_project_mrv_context
from app.services.reports.exporter import render_compliance_mrv_pdf
from app.services.schemes.kpis import compute_scheme_kpis
from app.services.storage import get_storage

MAX_PHOTOS = 50
README = """Aranyix BYOT — Evidence Bundle
================================

This archive contains audit-ready MRV evidence for a planting project.
It is prepared for third-party review (NHAI, NGT/CAMPA, Verra VM0047, ESG auditors).

Contents:
- manifest.json       SHA-256 hashes for every file in this bundle
- mrv-context.json    Structured project, tree, and compliance data
- mrv-compliance.pdf  Human-readable MRV compliance report
- carbon-summary.json Aggregated carbon metrics from registered trees
- scheme-summary.json Central govt scheme refs, convergence, and KPI status
- green-credit-summary.json MoEFCC Green Credit estimate (when scheme applies)
- integrity-fusion.json  Per-tree fusion scores and credit gate readiness
- photos/manifest.json Photo metadata (S3 keys, tree linkage)
- photos/*            Up to 50 primary tree photos when storage is available

DISCLAIMER: This bundle supports audit preparation. It does not constitute
certification, legal compliance, or carbon credit issuance.
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


async def build_project_evidence_bundle(
    db: AsyncSession,
    project: PlantingProject,
    *,
    include_photos: bool = True,
    max_photos: int = MAX_PHOTOS,
    sign: bool = True,
) -> tuple[bytes, dict[str, Any], EvidenceSignature | None]:
    """Build a zip evidence bundle and return (zip_bytes, summary, signature)."""
    ctx = await build_project_mrv_context(db, project)
    integrity_fusion = ctx.get("integrity_fusion")
    if integrity_fusion is None:
        try:
            from app.services.integrity.export import build_integrity_fusion_export

            integrity_fusion = await build_integrity_fusion_export(db, project)
        except Exception:
            integrity_fusion = None
    scheme_summary = await compute_scheme_kpis(db, project)
    meta = project.metadata_ or {}
    scheme_summary["scheme_refs"] = meta.get("scheme_refs") or {}
    scheme_summary["funding_sources"] = meta.get("funding_sources") or []
    scheme_summary["convergence"] = meta.get("convergence") or []

    green_credit_summary: dict[str, Any] | None = None
    if project.scheme_code == "green_credit_india" or (
        (meta.get("scheme_refs") or {}).get("green_credit_land_bank_id")
    ):
        green_credit_summary = await build_project_green_credit_summary(db, project)
    manifest_files: list[dict[str, Any]] = []
    buf = io.BytesIO()

    trees_res = await db.execute(
        select(Tree)
        .options(selectinload(Tree.images))
        .where(Tree.project_id == project.id, Tree.status != "removed")
        .order_by(Tree.created_at.asc())
        .limit(2000)
    )
    trees = list(trees_res.scalars().all())

    total_carbon_kg = sum(float(t.current_carbon_kg or 0) for t in trees)
    carbon_summary = {
        "project_id": str(project.id),
        "project_code": project.code,
        "tree_count": len(trees),
        "total_carbon_kg": round(total_carbon_kg, 3),
        "total_co2e_kg": round(total_carbon_kg * 44 / 12, 3),
        "satellite_verified_count": sum(1 for t in trees if t.satellite_verified),
        "generated_at": datetime.now(UTC).isoformat(),
    }

    photo_manifest: list[dict[str, Any]] = []
    storage = get_storage()
    photos_included = 0

    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        _add_file(
            zf,
            "README.txt",
            README.encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "mrv-context.json",
            json.dumps(ctx, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "carbon-summary.json",
            json.dumps(carbon_summary, indent=2).encode("utf-8"),
            manifest_files,
        )
        _add_file(
            zf,
            "scheme-summary.json",
            json.dumps(scheme_summary, indent=2, default=str).encode("utf-8"),
            manifest_files,
        )
        if green_credit_summary is not None:
            _add_file(
                zf,
                "green-credit-summary.json",
                json.dumps(green_credit_summary, indent=2, default=str).encode("utf-8"),
                manifest_files,
            )
        if integrity_fusion is not None:
            _add_file(
                zf,
                "integrity-fusion.json",
                json.dumps(integrity_fusion, indent=2, default=str).encode("utf-8"),
                manifest_files,
            )
        pdf = render_compliance_mrv_pdf(ctx)
        _add_file(zf, "mrv-compliance.pdf", pdf, manifest_files)

        if include_photos:
            for tree in trees:
                if photos_included >= max_photos:
                    break
                primary = next((img for img in (tree.images or []) if img.is_primary), None)
                if primary is None and tree.images:
                    primary = tree.images[0]
                if primary is None:
                    continue
                photo_manifest.append(
                    {
                        "tree_id": str(tree.id),
                        "public_code": tree.public_code,
                        "s3_key": primary.s3_key,
                        "is_primary": primary.is_primary,
                    }
                )
                if storage.is_available():
                    raw = storage.get_bytes(primary.s3_key)
                    if raw:
                        ext = primary.s3_key.rsplit(".", 1)[-1] if "." in primary.s3_key else "jpg"
                        path = f"photos/{tree.public_code}.{ext}"
                        _add_file(zf, path, raw, manifest_files)
                        photos_included += 1

            _add_file(
                zf,
                "photos/manifest.json",
                json.dumps(photo_manifest, indent=2).encode("utf-8"),
                manifest_files,
            )

        bundle_manifest = {
            "bundle_version": "aranyix-evidence-1.2.0",
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

    zip_bytes = buf.getvalue()
    bundle_sha256 = zip_content_hash(zip_bytes)
    signature = sign_evidence_zip(zip_bytes) if sign else None
    summary = {
        "project_id": str(project.id),
        "project_code": project.code,
        "file_count": len(manifest_files),
        "photos_included": photos_included,
        "bundle_sha256": bundle_sha256,
        "zip_size_bytes": len(zip_bytes),
        "signed": signature is not None,
        "signature_key_id": signature.key_id if signature else None,
    }
    return zip_bytes, summary, signature
