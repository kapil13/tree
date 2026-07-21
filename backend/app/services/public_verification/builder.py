"""Build read-only public verification payloads."""

from __future__ import annotations

import hashlib
import json
import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.compliance_checklist import ProjectChecklistResponse
from app.models.credit_ledger import ProjectCreditLedger
from app.models.planting_project import PlantingProject
from app.models.public_verification import PublicVerificationLink
from app.models.tree import Tree
from app.services.planting_projects.mrv_export import build_project_mrv_context

DISCLAIMER = (
    "Public verification snapshot for third-party review. "
    "Not certification, legal compliance, or carbon credit issuance."
)


def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)


def _snapshot_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def public_verify_url(token: str) -> str:
    base = settings.app_frontend_url.rstrip("/")
    return f"{base}/verify/{token}"


async def build_project_verification_payload(
    db: AsyncSession, project: PlantingProject
) -> dict[str, Any]:
    mrv = await build_project_mrv_context(db, project)
    summary = mrv["summary"]

    ledger_res = await db.execute(
        select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
    )
    ledger = ledger_res.scalar_one_or_none()

    checklist_res = await db.execute(
        select(ProjectChecklistResponse).where(ProjectChecklistResponse.project_id == project.id)
    )
    checklists = list(checklist_res.scalars().all())

    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed").limit(5)
    )
    sample_trees = [
        {
            "public_code": t.public_code,
            "species": t.species_text or "Unknown",
            "health": t.current_health,
            "carbon_kg": float(t.current_carbon_kg or 0),
            "geo_tagged": t.last_geotag_at is not None,
        }
        for t in trees_res.scalars().all()
    ]

    core = {
        "resource_type": "planting_project",
        "project": {
            "code": project.code,
            "name": project.name,
            "segment": project.segment,
            "status": project.status,
            "compliance_mode": project.compliance_mode,
        },
        "summary": {
            "tree_count": summary.get("tree_count", 0),
            "work_area_count": summary.get("work_area_count", 0),
            "open_violations": summary.get("open_violations", 0),
            "native_species_pct": summary.get("native_species_pct"),
        },
        "credit_ledger": {
            "status": ledger.status if ledger else None,
            "net_credits_tco2e": float(ledger.net_credits_tco2e) if ledger else None,
            "methodology": ledger.methodology if ledger else None,
        },
        "checklists": [
            {
                "code": row.checklist_code,
                "eligibility_status": row.eligibility_status,
                "score_pct": float(row.score_pct),
            }
            for row in checklists
        ],
        "sample_trees": sample_trees,
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
    }
    core["snapshot_sha256"] = _snapshot_hash(
        {k: v for k, v in core.items() if k not in ("generated_at", "disclaimer")}
    )
    return core


async def build_tree_verification_payload(db: AsyncSession, tree: Tree) -> dict[str, Any]:
    core = {
        "resource_type": "tree",
        "tree": {
            "public_code": tree.public_code,
            "species": tree.species_text or "Unknown",
            "health": tree.current_health,
            "status": tree.status,
            "carbon_kg": float(tree.current_carbon_kg or 0),
            "satellite_verified": bool(tree.satellite_verified),
            "planted_at": tree.planted_at.isoformat() if tree.planted_at else None,
            "last_geotag_at": tree.last_geotag_at.isoformat() if tree.last_geotag_at else None,
        },
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
    }
    core["snapshot_sha256"] = _snapshot_hash(
        {k: v for k, v in core.items() if k not in ("generated_at", "disclaimer")}
    )
    return core


async def resolve_public_verification(
    db: AsyncSession, token: str
) -> tuple[PublicVerificationLink, dict[str, Any]]:
    res = await db.execute(
        select(PublicVerificationLink).where(PublicVerificationLink.token == token)
    )
    link = res.scalar_one_or_none()
    if link is None:
        raise ValueError("link_not_found")
    if link.revoked_at is not None:
        raise ValueError("link_revoked")
    if link.expires_at and link.expires_at < datetime.now(UTC):
        raise ValueError("link_expired")

    if link.resource_type == "planting_project":
        project = await db.get(PlantingProject, link.resource_id)
        if project is None:
            raise ValueError("resource_not_found")
        payload = await build_project_verification_payload(db, project)
    elif link.resource_type == "tree":
        tree = await db.get(Tree, link.resource_id)
        if tree is None:
            raise ValueError("resource_not_found")
        payload = await build_tree_verification_payload(db, tree)
    else:
        raise ValueError("unsupported_resource")

    link.view_count += 1
    link.last_viewed_at = datetime.now(UTC)
    payload["link"] = {
        "label": link.label,
        "created_at": link.created_at.isoformat(),
        "view_count": link.view_count,
    }
    return link, payload


async def create_verification_link(
    db: AsyncSession,
    *,
    resource_type: str,
    resource_id: uuid.UUID,
    organization_id: uuid.UUID | None,
    label: str,
    created_by_user_id: uuid.UUID,
    expires_at: datetime | None = None,
) -> PublicVerificationLink:
    link = PublicVerificationLink(
        token=generate_verification_token(),
        resource_type=resource_type,
        resource_id=resource_id,
        organization_id=organization_id,
        label=label,
        created_by_user_id=created_by_user_id,
        expires_at=expires_at,
    )
    db.add(link)
    await db.flush()
    return link
