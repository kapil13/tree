"""Seed the database with demo organizations, personas, scheme matrix, and workflow fixtures.

Run inside the container:
    python -m app.scripts.seed_demo
"""

from __future__ import annotations

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import delete, select, update

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.planting_program import ProgramAccessRequest
from app.models.species import Species
from app.models.tree import Tree
from app.models.user import User
from app.scripts.seed_helpers import ensure_scheme_matrix, seed_workflow_fixtures
from app.services.carbon.species_catalog import SPECIES_CATALOG
from app.services.planting_programs.catalog import default_program_code
from app.services.planting_programs.enrollment import get_program_by_code, set_user_programs

DEMO_EMAIL = "demo@byot.earth"
DEMO_VIEWER_EMAIL = "viewer@byot.earth"
DEMO_VERIFIER_EMAIL = "verifier@byot.earth"
DEMO_MANAGER_EMAIL = "manager@byot.earth"
DEMO_FIELD_WORKER_EMAIL = "fieldworker@byot.earth"
DEMO_SUPERVISOR_EMAIL = "supervisor@byot.earth"
DEMO_CORPORATE_EMAIL = "corporate@byot.earth"
DEMO_NGO_EMAIL = "ngo@byot.earth"
DEMO_PASSWORD = "byotdemo1234!"

CITIZEN_TREE_TARGET = 12
ORG_TREE_TARGET = 18


async def _ensure_user(
    db,
    *,
    email: str,
    full_name: str,
    role: str,
    org: Organization | None = None,
    org_role: str | None = None,
    is_org_admin: bool = False,
    program_codes: list[str] | None = None,
) -> User:
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(DEMO_PASSWORD),
            role=role,
            organization_id=org.id if org else None,
            org_role=org_role,
            is_org_admin=is_org_admin,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.full_name = full_name
        user.hashed_password = hash_password(DEMO_PASSWORD)
        user.role = role
        user.organization_id = org.id if org else None
        user.org_role = org_role
        user.is_org_admin = is_org_admin
        user.is_active = True
        user.is_verified = True

    codes = program_codes or [default_program_code()]
    programs = []
    for code in codes:
        program = await get_program_by_code(db, code)
        if program is not None:
            programs.append(program.code)
    if programs:
        await set_user_programs(db, user.id, programs)

    await db.execute(delete(ProgramAccessRequest).where(ProgramAccessRequest.user_id == user.id))
    return user


async def _ensure_demo_user(db) -> User:
    """Citizen BYOT account (personal grove, no org)."""
    return await _ensure_user(
        db,
        email=DEMO_EMAIL,
        full_name="Demo Citizen",
        role="user",
        program_codes=[default_program_code()],
    )


async def _ensure_demo_manager(db, org: Organization) -> User:
    user = await _ensure_user(
        db,
        email=DEMO_MANAGER_EMAIL,
        full_name="Demo Program Manager",
        role="government",
        org=org,
        org_role="manager",
        is_org_admin=True,
        program_codes=[default_program_code(), "government_nhai"],
    )
    org.owner_user_id = user.id
    meta = dict(org.metadata_ or {})
    codes = list(meta.get("program_codes") or [])
    if "government_nhai" not in codes:
        codes.append("government_nhai")
    meta["program_codes"] = codes
    org.metadata_ = meta
    org.type = "government"
    return user


async def _ensure_demo_viewer(db, org: Organization) -> User:
    return await _ensure_user(
        db,
        email=DEMO_VIEWER_EMAIL,
        full_name="Demo Viewer",
        role="government",
        org=org,
        org_role="viewer",
        program_codes=[default_program_code(), "government_nhai"],
    )


async def _ensure_demo_verifier(db, org: Organization) -> User:
    return await _ensure_user(
        db,
        email=DEMO_VERIFIER_EMAIL,
        full_name="Demo Verifier",
        role="verifier",
        org=org,
        org_role="verifier",
        program_codes=[default_program_code(), "government_nhai"],
    )


async def _ensure_demo_field_worker(db, org: Organization) -> User:
    return await _ensure_user(
        db,
        email=DEMO_FIELD_WORKER_EMAIL,
        full_name="Demo Field Worker",
        role="field_worker",
        org=org,
        org_role="worker",
        program_codes=[default_program_code(), "government_nhai"],
    )


async def _ensure_demo_supervisor(db, org: Organization) -> User:
    return await _ensure_user(
        db,
        email=DEMO_SUPERVISOR_EMAIL,
        full_name="Demo Field Supervisor",
        role="field_supervisor",
        org=org,
        org_role="supervisor",
        program_codes=[default_program_code(), "government_nhai"],
    )


async def _ensure_demo_corporate(db, org: Organization) -> User:
    return await _ensure_user(
        db,
        email=DEMO_CORPORATE_EMAIL,
        full_name="Demo Corporate Manager",
        role="corporate",
        org=org,
        org_role="manager",
        is_org_admin=False,
        program_codes=[default_program_code(), "corporate_esg"],
    )


async def _ensure_demo_ngo(db, org: Organization) -> User:
    return await _ensure_user(
        db,
        email=DEMO_NGO_EMAIL,
        full_name="Demo NGO Manager",
        role="ngo",
        org=org,
        org_role="manager",
        is_org_admin=False,
        program_codes=[default_program_code(), "ngo_community"],
    )


def _tree_payload(
    *,
    rng: random.Random,
    public_code: str,
    owner_user_id,
    organization_id,
) -> Tree:
    sp = rng.choice(SPECIES_CATALOG)
    lat = 12.9716 + rng.uniform(-0.05, 0.05)
    lon = 77.5946 + rng.uniform(-0.05, 0.05)
    return Tree(
        public_code=public_code,
        owner_user_id=owner_user_id,
        organization_id=organization_id,
        species_text=sp.common_name,
        planted_at=date.today() - timedelta(days=rng.randint(180, 1800)),
        location=f"POINT({lon} {lat})",
        altitude_m=rng.uniform(800, 950),
        accuracy_m=rng.uniform(2, 8),
        current_health=rng.choices(["healthy", "moderate", "unhealthy"], weights=[7, 2, 1])[0],
        current_dbh_cm=rng.uniform(5, 30),
        current_height_m=rng.uniform(2, 12),
        current_canopy_m=rng.uniform(1, 6),
        current_carbon_kg=rng.uniform(20, 150),
        satellite_verified=rng.random() < 0.7,
        status="active",
        metadata_={"visibility_public": True},
    )


async def _next_public_code(db, prefix: str) -> str:
    existing = (
        await db.execute(select(Tree.public_code).where(Tree.public_code.like(f"{prefix}-%")))
    ).scalars().all()
    used = set(existing)
    for i in range(10_000):
        code = f"{prefix}-{i:04d}"
        if code not in used:
            return code
    raise RuntimeError(f"no_available_codes_for_{prefix}")


async def _rebalance_demo_portfolios(
    db,
    *,
    citizen: User,
    manager: User,
    org: Organization,
) -> dict[str, int]:
    """Always split citizen personal trees from org NHAI portfolio (idempotent)."""
    stats = {
        "citizen_personal": 0,
        "org_portfolio": 0,
        "citizen_detached_from_org": 0,
        "citizen_created": 0,
        "org_created": 0,
    }

    detached = await db.execute(
        update(Tree)
        .where(Tree.owner_user_id == citizen.id)
        .where(Tree.organization_id.is_not(None))
        .values(organization_id=None)
    )
    stats["citizen_detached_from_org"] = detached.rowcount or 0

    citizen_trees = list(
        (
            await db.execute(
                select(Tree)
                .where(Tree.owner_user_id == citizen.id)
                .order_by(Tree.created_at.asc())
            )
        ).scalars().all()
    )

    rng = random.Random(42)
    for index, tree in enumerate(citizen_trees):
        tree.organization_id = None
        tree.project_id = None
        meta = dict(tree.metadata_ or {})
        meta["visibility_public"] = True
        tree.metadata_ = meta
        if not tree.public_code.startswith("BYOT-DEMO-"):
            tree.public_code = f"BYOT-DEMO-{index:04d}"

    while len(citizen_trees) < CITIZEN_TREE_TARGET:
        code = await _next_public_code(db, "BYOT-DEMO")
        tree = _tree_payload(
            rng=rng,
            public_code=code,
            owner_user_id=citizen.id,
            organization_id=None,
        )
        db.add(tree)
        citizen_trees.append(tree)
        stats["citizen_created"] += 1

    stats["citizen_personal"] = len(citizen_trees)

    org_trees = list(
        (
            await db.execute(
                select(Tree)
                .where(Tree.organization_id == org.id, Tree.project_id.is_(None))
                .order_by(Tree.created_at.asc())
            )
        ).scalars().all()
    )

    for index, tree in enumerate(org_trees):
        if tree.owner_user_id != manager.id:
            tree.owner_user_id = manager.id
        if not tree.public_code.startswith("NHAI-DEMO-"):
            tree.public_code = f"NHAI-DEMO-{index:04d}"

    org_rng = random.Random(99)
    while len(org_trees) < ORG_TREE_TARGET:
        code = await _next_public_code(db, "NHAI-DEMO")
        tree = _tree_payload(
            rng=org_rng,
            public_code=code,
            owner_user_id=manager.id,
            organization_id=org.id,
        )
        db.add(tree)
        org_trees.append(tree)
        stats["org_created"] += 1

    stats["org_portfolio"] = len(org_trees)
    await db.flush()
    return stats


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = {
            r.scientific_name
            for r in (await db.execute(select(Species))).scalars().all()
        }
        for sp in SPECIES_CATALOG:
            if sp.scientific_name in existing:
                continue
            db.add(
                Species(
                    scientific_name=sp.scientific_name,
                    common_name=sp.common_name,
                    family=sp.family,
                    agb_coef_a=sp.agb_coef_a,
                    agb_coef_b=sp.agb_coef_b,
                    wood_density=sp.wood_density,
                    root_shoot_ratio=sp.root_shoot_ratio,
                    carbon_fraction=sp.carbon_fraction,
                    max_height_m=sp.max_height_m,
                    max_dbh_cm=sp.max_dbh_cm,
                    growth_curve={str(k): v for k, v in (sp.growth_curve or {}).items()},
                )
            )
        await db.flush()

        org = (
            await db.execute(select(Organization).where(Organization.slug == "demo-farm"))
        ).scalar_one_or_none()
        if org is None:
            org = Organization(name="Demo Farm", slug="demo-farm", type="government")
            db.add(org)
            await db.flush()

        citizen = await _ensure_demo_user(db)
        manager = await _ensure_demo_manager(db, org)
        await _ensure_demo_viewer(db, org)
        verifier = await _ensure_demo_verifier(db, org)
        field_worker = await _ensure_demo_field_worker(db, org)
        supervisor = await _ensure_demo_supervisor(db, org)
        await _ensure_demo_corporate(db, org)
        await _ensure_demo_ngo(db, org)

        stats = await _rebalance_demo_portfolios(db, citizen=citizen, manager=manager, org=org)
        projects = await ensure_scheme_matrix(db, org=org, manager=manager)
        workflow_stats = await seed_workflow_fixtures(
            db,
            org=org,
            manager=manager,
            supervisor=supervisor,
            verifier=verifier,
            field_worker=field_worker,
            citizen=citizen,
            projects=projects,
        )

        await db.commit()
        print(
            f"Demo data ready. Password for all: {DEMO_PASSWORD}\n"
            f"  Citizen (personal BYOT): {DEMO_EMAIL} -> {stats['citizen_personal']} trees\n"
            f"  Org admin: {DEMO_MANAGER_EMAIL} -> {stats['org_portfolio']} unassigned org trees\n"
            f"  Field worker: {DEMO_FIELD_WORKER_EMAIL}\n"
            f"  Field supervisor: {DEMO_SUPERVISOR_EMAIL}\n"
            f"  Corporate manager: {DEMO_CORPORATE_EMAIL}\n"
            f"  NGO manager: {DEMO_NGO_EMAIL}\n"
            f"  Viewer (read-only): {DEMO_VIEWER_EMAIL}\n"
            f"  Verifier: {DEMO_VERIFIER_EMAIL}\n"
            f"  Scheme demo projects: {len(projects)} (13-scheme matrix)\n"
            f"  Workflow fixtures: {workflow_stats}\n"
            f"  Rebalance: detached {stats['citizen_detached_from_org']} citizen trees from org, "
            f"created {stats['citizen_created']} citizen + {stats['org_created']} org trees"
        )


if __name__ == "__main__":
    asyncio.run(seed())
