"""Globally unique credit serial numbers, retirement, custody."""

from __future__ import annotations

import hashlib
import io
import uuid
from datetime import UTC, datetime
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim_registry import ClaimRegistry
from app.models.credit_ledger import CreditLedgerEvent, ProjectCreditLedger
from app.models.credit_serial import CreditSerial
from app.models.credit_transfer import CreditTransfer
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.credits.claims import register_tree_claim

SERIAL_PREFIX = "BYOT"


def _state_code(project: PlantingProject) -> str:
    meta = project.metadata_ or {}
    state = meta.get("state_code") or meta.get("state") or "IN"
    return str(state).upper()[:8]


async def _next_serial_sequence(db: AsyncSession, vintage_year: int, state_code: str) -> int:
    prefix = f"{SERIAL_PREFIX}-{vintage_year}-{state_code}-"
    res = await db.execute(
        select(func.count())
        .select_from(CreditSerial)
        .where(CreditSerial.serial_number.like(f"{prefix}%"))
    )
    return int(res.scalar_one()) + 1


def format_serial_number(vintage_year: int, state_code: str, seq: int) -> str:
    return f"{SERIAL_PREFIX}-{vintage_year}-{state_code}-{seq:06d}"


def vintage_year_for_ledger(ledger: ProjectCreditLedger) -> int:
    return ledger.last_computed_at.year if ledger.last_computed_at else datetime.now(UTC).year


async def mint_serial_for_issue(
    db: AsyncSession,
    *,
    ledger: ProjectCreditLedger,
    ledger_event: CreditLedgerEvent,
    project: PlantingProject,
) -> CreditSerial:
    vintage = vintage_year_for_ledger(ledger)
    state = _state_code(project)
    seq = await _next_serial_sequence(db, vintage, state)
    serial = CreditSerial(
        serial_number=format_serial_number(vintage, state, seq),
        ledger_event_id=ledger_event.id,
        project_id=project.id,
        organization_id=ledger.organization_id or project.organization_id,
        vintage_year=vintage,
        tco2e_amount=float(ledger.issued_credits_tco2e or ledger.net_credits_tco2e),
        status="available",
    )
    db.add(serial)
    await db.flush()
    return serial


async def register_project_tree_claims(
    db: AsyncSession,
    *,
    project: PlantingProject,
    ledger_event: CreditLedgerEvent,
) -> list[ClaimRegistry]:
    if not project.scheme_code:
        return []
    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    claims: list[ClaimRegistry] = []
    for tree in trees:
        claim = await register_tree_claim(
            db,
            tree_id=tree.id,
            scheme_code=project.scheme_code,
            ledger_event_id=ledger_event.id,
        )
        claims.append(claim)
    return claims


async def retire_serial(
    db: AsyncSession,
    serial: CreditSerial,
    *,
    beneficiary: str,
    retirement_reason: str | None = None,
    paris_article6: bool = False,
    corresponding_adjustment_ref: str | None = None,
) -> CreditSerial:
    if serial.status != "available":
        raise ValueError("serial_not_available")
    serial.status = "retired"
    serial.retired_at = datetime.now(UTC)
    serial.beneficiary = beneficiary.strip()
    serial.retirement_reason = retirement_reason
    serial.paris_article6 = paris_article6
    serial.corresponding_adjustment_ref = corresponding_adjustment_ref
    await db.flush()
    return serial


def custody_hash(
    *,
    serial_id: uuid.UUID,
    from_org_id: uuid.UUID,
    to_org_id: uuid.UUID,
    transferred_at: datetime,
) -> str:
    payload = f"{serial_id}:{from_org_id}:{to_org_id}:{transferred_at.isoformat()}"
    return hashlib.sha256(payload.encode()).hexdigest()


async def transfer_serial_custody(
    db: AsyncSession,
    serial: CreditSerial,
    *,
    from_org_id: uuid.UUID,
    to_org_id: uuid.UUID,
    notes: str | None = None,
) -> CreditTransfer:
    if serial.status != "available":
        raise ValueError("serial_not_transferable")
    now = datetime.now(UTC)
    transfer = CreditTransfer(
        serial_id=serial.id,
        from_org_id=from_org_id,
        to_org_id=to_org_id,
        transferred_at=now,
        custody_hash=custody_hash(
            serial_id=serial.id,
            from_org_id=from_org_id,
            to_org_id=to_org_id,
            transferred_at=now,
        ),
        notes=notes,
    )
    serial.organization_id = to_org_id
    db.add(transfer)
    await db.flush()
    return transfer


def serial_to_dict(serial: CreditSerial) -> dict[str, Any]:
    return {
        "id": str(serial.id),
        "serial_number": serial.serial_number,
        "project_id": str(serial.project_id),
        "organization_id": str(serial.organization_id) if serial.organization_id else None,
        "vintage_year": serial.vintage_year,
        "tco2e_amount": float(serial.tco2e_amount),
        "status": serial.status,
        "retired_at": serial.retired_at.isoformat() if serial.retired_at else None,
        "beneficiary": serial.beneficiary,
        "retirement_reason": serial.retirement_reason,
        "paris_article6": serial.paris_article6,
        "corresponding_adjustment_ref": serial.corresponding_adjustment_ref,
        "created_at": serial.created_at.isoformat(),
    }


def render_retirement_certificate_pdf(serial: CreditSerial, project: PlantingProject) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 30 * mm
    c.setFont("Helvetica-Bold", 16)
    c.drawString(30 * mm, y, "BYOT Credit Retirement Certificate")
    y -= 12 * mm
    c.setFont("Helvetica", 11)
    lines = [
        f"Serial number: {serial.serial_number}",
        f"Vintage year: {serial.vintage_year}",
        f"Amount retired: {float(serial.tco2e_amount):.4f} tCO₂e",
        f"Project: {project.code} — {project.name}",
        f"Beneficiary: {serial.beneficiary or '—'}",
        f"Retired at: {serial.retired_at.isoformat() if serial.retired_at else '—'}",
        f"Reason: {serial.retirement_reason or '—'}",
    ]
    if serial.paris_article6:
        lines.append("Paris Agreement Article 6: Yes")
        if serial.corresponding_adjustment_ref:
            lines.append(f"Corresponding adjustment ref: {serial.corresponding_adjustment_ref}")
    for line in lines:
        c.drawString(30 * mm, y, line)
        y -= 7 * mm
    y -= 5 * mm
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(
        30 * mm,
        y,
        "This certificate records retirement in the BYOT registry. It is not external registry issuance.",
    )
    c.showPage()
    c.save()
    return buf.getvalue()
