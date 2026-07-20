"""Carbon credit ledger computation and state transitions."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, date, datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_ledger import CreditLedgerEvent, ProjectCreditLedger
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import BUFFER_POOL, ENGINE_VERSION

MethodologyCode = Literal["IPCC_AR6", "VERRA_VM0047", "GOLD_STANDARD_LUF"]
CreditStatus = Literal["estimated", "verified", "buffered", "issued"]

VALID_TRANSITIONS: dict[str, set[str]] = {
    "estimated": {"verified"},
    "verified": {"buffered", "estimated"},
    "buffered": {"issued", "verified"},
    "issued": set(),
}


def _age_cohort(planted_at: date | None) -> str:
    if planted_at is None:
        return "unknown"
    years = (date.today() - planted_at).days / 365.25
    if years < 3:
        return "0-2y"
    if years < 6:
        return "3-5y"
    if years < 11:
        return "6-10y"
    return "10+y"


def _buffer_pct(methodology: str) -> float:
    return BUFFER_POOL.get(methodology, 0.0)


def compute_strata(trees: list[Tree]) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, str], dict[str, Any]] = defaultdict(
        lambda: {"tree_count": 0, "carbon_kg": 0.0, "co2e_kg": 0.0}
    )
    for tree in trees:
        species = tree.species_text or "Unknown"
        cohort = _age_cohort(tree.planted_at)
        key = (species, cohort)
        carbon = float(tree.current_carbon_kg or 0)
        buckets[key]["species"] = species
        buckets[key]["age_cohort"] = cohort
        buckets[key]["tree_count"] += 1
        buckets[key]["carbon_kg"] += carbon
        buckets[key]["co2e_kg"] += carbon * 44 / 12

    strata = []
    for item in buckets.values():
        item["carbon_kg"] = round(item["carbon_kg"], 3)
        item["co2e_kg"] = round(item["co2e_kg"], 3)
        item["credits_tco2e"] = round(item["co2e_kg"] / 1000.0, 4)
        strata.append(item)
    strata.sort(key=lambda s: (-s["tree_count"], s["species"]))
    return strata


def compute_ledger_totals(
    trees: list[Tree], methodology: MethodologyCode = "VERRA_VM0047"
) -> dict[str, Any]:
    total_carbon_kg = sum(float(t.current_carbon_kg or 0) for t in trees)
    total_co2e_kg = total_carbon_kg * 44 / 12
    gross = total_co2e_kg / 1000.0
    buffer_pct = _buffer_pct(methodology)
    buffer_withheld = gross * buffer_pct
    net = gross * (1.0 - buffer_pct)
    return {
        "tree_count": len(trees),
        "gross_credits_tco2e": round(gross, 4),
        "buffer_pct": buffer_pct,
        "buffer_withheld_tco2e": round(buffer_withheld, 4),
        "net_credits_tco2e": round(net, 4),
        "engine_version": ENGINE_VERSION,
        "strata": compute_strata(trees),
    }


async def get_or_create_ledger(
    db: AsyncSession, project: PlantingProject
) -> ProjectCreditLedger | None:
    res = await db.execute(
        select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
    )
    return res.scalar_one_or_none()


async def sync_project_ledger(
    db: AsyncSession,
    project: PlantingProject,
    *,
    methodology: MethodologyCode = "VERRA_VM0047",
) -> ProjectCreditLedger:
    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    totals = compute_ledger_totals(trees, methodology)
    now = datetime.now(UTC)

    ledger = await get_or_create_ledger(db, project)
    if ledger is None:
        ledger = ProjectCreditLedger(
            project_id=project.id,
            organization_id=project.organization_id,
            methodology=methodology,
            status="estimated",
            created_at=now,
            updated_at=now,
        )
        db.add(ledger)

    if ledger.status != "issued":
        ledger.methodology = methodology

    ledger.tree_count = totals["tree_count"]
    ledger.gross_credits_tco2e = totals["gross_credits_tco2e"]
    ledger.buffer_pct = totals["buffer_pct"]
    ledger.buffer_withheld_tco2e = totals["buffer_withheld_tco2e"]
    ledger.net_credits_tco2e = totals["net_credits_tco2e"]
    ledger.engine_version = totals["engine_version"]
    ledger.strata = totals["strata"]
    ledger.last_computed_at = now
    ledger.updated_at = now
    if ledger.organization_id is None:
        ledger.organization_id = project.organization_id

    await db.flush()
    return ledger


def ledger_to_dict(ledger: ProjectCreditLedger, events: list[CreditLedgerEvent] | None = None) -> dict:
    return {
        "id": str(ledger.id),
        "project_id": str(ledger.project_id),
        "organization_id": str(ledger.organization_id) if ledger.organization_id else None,
        "methodology": ledger.methodology,
        "status": ledger.status,
        "tree_count": ledger.tree_count,
        "gross_credits_tco2e": float(ledger.gross_credits_tco2e),
        "buffer_pct": float(ledger.buffer_pct),
        "buffer_withheld_tco2e": float(ledger.buffer_withheld_tco2e),
        "net_credits_tco2e": float(ledger.net_credits_tco2e),
        "issued_credits_tco2e": float(ledger.issued_credits_tco2e)
        if ledger.issued_credits_tco2e is not None
        else None,
        "registry_reference": ledger.registry_reference,
        "engine_version": ledger.engine_version,
        "strata": ledger.strata or [],
        "last_computed_at": ledger.last_computed_at.isoformat(),
        "disclaimer": (
            "Ledger estimates support audit preparation. Credits are not issued until "
            "recorded with an external registry reference."
        ),
        "events": [
            {
                "id": str(e.id),
                "from_status": e.from_status,
                "to_status": e.to_status,
                "notes": e.notes,
                "registry_reference": e.registry_reference,
                "actor_user_id": str(e.actor_user_id) if e.actor_user_id else None,
                "created_at": e.created_at.isoformat(),
            }
            for e in (events or [])
        ],
    }


async def transition_ledger_status(
    db: AsyncSession,
    ledger: ProjectCreditLedger,
    *,
    to_status: CreditStatus,
    actor_user_id: uuid.UUID | None,
    notes: str | None = None,
    registry_reference: str | None = None,
) -> ProjectCreditLedger:
    from_status = ledger.status
    allowed = VALID_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise ValueError(f"invalid_transition:{from_status}->{to_status}")

    if to_status == "issued":
        if not registry_reference or not registry_reference.strip():
            raise ValueError("registry_reference_required")
        ledger.issued_credits_tco2e = ledger.net_credits_tco2e
        ledger.registry_reference = registry_reference.strip()

    ledger.status = to_status
    event = CreditLedgerEvent(
        ledger_id=ledger.id,
        actor_user_id=actor_user_id,
        from_status=from_status,
        to_status=to_status,
        notes=notes,
        registry_reference=registry_reference,
    )
    db.add(event)
    await db.flush()
    return ledger


async def org_credit_summary(db: AsyncSession, organization_id: uuid.UUID) -> dict[str, Any]:
    res = await db.execute(
        select(ProjectCreditLedger).where(ProjectCreditLedger.organization_id == organization_id)
    )
    ledgers = list(res.scalars().all())
    by_status: dict[str, int] = defaultdict(int)
    gross = buffer = net = issued = 0.0
    for ledger in ledgers:
        by_status[ledger.status] += 1
        gross += float(ledger.gross_credits_tco2e)
        buffer += float(ledger.buffer_withheld_tco2e)
        net += float(ledger.net_credits_tco2e)
        if ledger.issued_credits_tco2e is not None:
            issued += float(ledger.issued_credits_tco2e)

    return {
        "project_count": len(ledgers),
        "by_status": dict(by_status),
        "total_gross_credits_tco2e": round(gross, 4),
        "total_buffer_withheld_tco2e": round(buffer, 4),
        "total_net_credits_tco2e": round(net, 4),
        "total_issued_credits_tco2e": round(issued, 4),
    }
