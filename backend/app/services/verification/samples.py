"""Verifier sample workflow — attest without editing measurements."""

from __future__ import annotations

import hashlib
import io
import json
import random
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.verification_workflow import VerificationItem, VerificationSample
from app.services.signing.india_esign import sign_attestation

SampleMethod = Literal["random", "stratified"]
ItemStatus = Literal["pending", "approved", "rejected"]


async def create_verification_sample(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    organization_id: uuid.UUID | None,
    sample_pct: float,
    method: SampleMethod,
    created_by: uuid.UUID,
) -> VerificationSample:
    if sample_pct <= 0 or sample_pct > 100:
        raise ValueError("invalid_sample_pct")

    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project_id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    if not trees:
        raise ValueError("no_trees_in_project")

    count = max(1, round(len(trees) * sample_pct / 100.0))
    if method == "stratified":
        by_species: dict[str, list[Tree]] = {}
        for tree in trees:
            key = tree.species_text or "Unknown"
            by_species.setdefault(key, []).append(tree)
        selected: list[Tree] = []
        for group in by_species.values():
            take = max(1, round(len(group) * sample_pct / 100.0))
            selected.extend(random.sample(group, min(take, len(group))))
        selected = selected[:count]
    else:
        selected = random.sample(trees, min(count, len(trees)))

    sample = VerificationSample(
        project_id=project_id,
        organization_id=organization_id,
        sample_pct=sample_pct,
        method=method,
        created_by=created_by,
    )
    db.add(sample)
    await db.flush()

    for tree in selected:
        db.add(
            VerificationItem(
                sample_id=sample.id,
                tree_id=tree.id,
                status="pending",
            )
        )
    await db.flush()
    return sample


def _attestation_hash(item: VerificationItem, tree: Tree, verifier_id: uuid.UUID) -> str:
    payload = {
        "sample_id": str(item.sample_id),
        "tree_id": str(tree.id),
        "public_code": tree.public_code,
        "status": item.status,
        "verifier_id": str(verifier_id),
        "signed_at": item.signed_at.isoformat() if item.signed_at else None,
        "notes": item.notes,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def attest_verification_item(
    db: AsyncSession,
    item: VerificationItem,
    tree: Tree,
    *,
    verifier_id: uuid.UUID,
    status: ItemStatus,
    notes: str | None = None,
    verifier_name: str | None = None,
    with_esign: bool = True,
) -> VerificationItem:
    if item.status != "pending":
        raise ValueError("item_already_attested")
    if status not in ("approved", "rejected"):
        raise ValueError("invalid_attestation_status")
    item.status = status
    item.verifier_id = verifier_id
    item.signed_at = datetime.now(UTC)
    item.notes = notes
    item.attestation_hash = _attestation_hash(item, tree, verifier_id)

    if with_esign and item.attestation_hash:
        esign = await sign_attestation(
            item.attestation_hash,
            verifier_name=verifier_name,
            tree_public_code=tree.public_code,
            sample_id=str(item.sample_id),
        )
        item.esign_ref = esign.esign_ref
        item.esign_signature_b64 = esign.signature_b64

    await db.flush()
    return item


async def sample_summary(db: AsyncSession, sample: VerificationSample) -> dict[str, Any]:
    items = (
        await db.execute(select(VerificationItem).where(VerificationItem.sample_id == sample.id))
    ).scalars().all()
    by_status: dict[str, int] = {"pending": 0, "approved": 0, "rejected": 0}
    for item in items:
        by_status[item.status] = by_status.get(item.status, 0) + 1
    return {
        "id": str(sample.id),
        "project_id": str(sample.project_id),
        "sample_pct": float(sample.sample_pct),
        "method": sample.method,
        "status": sample.status,
        "item_count": len(items),
        "by_status": by_status,
        "created_at": sample.created_at.isoformat(),
    }


def render_sample_audit_pdf(
    sample: VerificationSample,
    items: list[VerificationItem],
    trees: dict[uuid.UUID, Tree],
) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    _width, height = A4
    y = height - 25 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(25 * mm, y, "BYOT Verification Sample Audit Report")
    y -= 10 * mm
    c.setFont("Helvetica", 10)
    c.drawString(25 * mm, y, f"Sample ID: {sample.id}")
    y -= 6 * mm
    c.drawString(25 * mm, y, f"Method: {sample.method} · Target: {float(sample.sample_pct):.1f}%")
    y -= 8 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(25 * mm, y, "Items")
    y -= 7 * mm
    c.setFont("Helvetica", 9)
    for item in items:
        tree = trees.get(item.tree_id)
        code = tree.public_code if tree else str(item.tree_id)
        line = f"{code} — {item.status}"
        if item.attestation_hash:
            line += f" · hash {item.attestation_hash[:12]}…"
        if item.esign_ref:
            line += f" · eSign {item.esign_ref[:16]}…"
        c.drawString(25 * mm, y, line)
        y -= 5 * mm
        if y < 30 * mm:
            c.showPage()
            y = height - 25 * mm
    c.showPage()
    c.save()
    return buf.getvalue()
