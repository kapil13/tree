"""Scheme family mapping and exclusive claim registration."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim_registry import ClaimRegistry
from app.models.tree import Tree

SCHEME_FAMILIES: dict[str, str] = {
    "campa_ca": "campa",
    "gim_restoration": "campa",
    "mishti_mangrove": "campa",
    "nagar_van": "campa",
    "nhai_highway": "campa",
    "sahakar_van": "campa",
    "green_credit_india": "green_credit",
    "verra_vm0047": "corporate_esg",
    "gold_standard_luf": "corporate_esg",
}


def scheme_family(scheme_code: str) -> str:
    return SCHEME_FAMILIES.get(scheme_code, scheme_code)


async def check_exclusive_claim_conflict(
    db: AsyncSession,
    *,
    tree_id: uuid.UUID,
    scheme_code: str,
    exclusive: bool = True,
) -> None:
    if not exclusive:
        return
    family = scheme_family(scheme_code)
    existing = (
        await db.execute(
            select(ClaimRegistry).where(
                ClaimRegistry.tree_id == tree_id,
                ClaimRegistry.scheme_family == family,
                ClaimRegistry.exclusive.is_(True),
                ClaimRegistry.valid_to.is_(None),
            )
        )
    ).scalar_one_or_none()
    if existing is not None and existing.scheme_code != scheme_code:
        raise ValueError(f"exclusive_claim_conflict:{family}:{existing.scheme_code}")


async def register_tree_claim(
    db: AsyncSession,
    *,
    tree_id: uuid.UUID,
    scheme_code: str,
    claim_type: str = "carbon",
    exclusive: bool = True,
    ledger_event_id: uuid.UUID | None = None,
    require_credit_eligible: bool = False,
) -> ClaimRegistry:
    fusion_score: float | None = None
    if require_credit_eligible:
        from app.services.integrity.registry_integration import assert_tree_registry_eligible

        eligibility = await assert_tree_registry_eligible(db, tree_id)
        fusion_score = eligibility.fusion_score
    await check_exclusive_claim_conflict(
        db, tree_id=tree_id, scheme_code=scheme_code, exclusive=exclusive
    )
    claim = ClaimRegistry(
        tree_id=tree_id,
        scheme_code=scheme_code,
        scheme_family=scheme_family(scheme_code),
        claim_type=claim_type,
        exclusive=exclusive,
        valid_from=datetime.now(UTC),
        ledger_event_id=ledger_event_id,
        fusion_score=fusion_score,
    )
    db.add(claim)
    await db.flush()
    return claim


def claim_to_dict(claim: ClaimRegistry, tree: Tree | None = None) -> dict[str, Any]:
    return {
        "id": str(claim.id),
        "tree_id": str(claim.tree_id),
        "tree_public_code": tree.public_code if tree else None,
        "scheme_code": claim.scheme_code,
        "scheme_family": claim.scheme_family,
        "claim_type": claim.claim_type,
        "exclusive": claim.exclusive,
        "fusion_score": float(claim.fusion_score) if claim.fusion_score is not None else None,
        "valid_from": claim.valid_from.isoformat(),
        "valid_to": claim.valid_to.isoformat() if claim.valid_to else None,
    }
