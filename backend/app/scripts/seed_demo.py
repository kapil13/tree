"""Seed the database with a demo organization, user, species catalog, and trees.

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
from app.models.planting_program import ProgramAccessRequest, UserPlantingProgram
from app.models.species import Species
from app.models.tree import Tree
from app.models.user import User
from app.services.carbon.species_catalog import SPECIES_CATALOG
from app.services.planting_programs.catalog import default_program_code
from app.services.planting_programs.enrollment import get_program_by_code, set_user_programs

DEMO_EMAIL = "demo@byot.earth"
DEMO_VIEWER_EMAIL = "viewer@byot.earth"
DEMO_MANAGER_EMAIL = "manager@byot.earth"
DEMO_PASSWORD = "byotdemo1234!"

CITIZEN_TREE_TARGET = 12
ORG_TREE_TARGET = 18


async def _ensure_demo_user(db) -> User:
    """Create or reset the demo citizen account (personal BYOT grove, no org)."""
    user = (await db.execute(select(User).where(User.email == DEMO_EMAIL))).scalar_one_or_none()
    if user is None:
        user = User(
            email=DEMO_EMAIL,
            full_name="Demo Citizen",
            hashed_password=hash_password(DEMO_PASSWORD),
            role="user",
            organization_id=None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.full_name = "Demo Citizen"
        user.hashed_password = hash_password(DEMO_PASSWORD)
        user.role = "user"
        user.organization_id = None
        user.is_org_admin = False
        user.org_role = None
        user.is_active = True
        user.is_verified = True

    byot = await get_program_by_code(db, default_program_code())
    if byot is not None:
        await db.execute(delete(UserPlantingProgram).where(UserPlantingProgram.user_id == user.id))
        await db.flush()
        await set_user_programs(db, user.id, [byot.code])

    await db.execute(delete(ProgramAccessRequest).where(ProgramAccessRequest.user_id == user.id))

    return user


async def _ensure_demo_manager(db, org: Organization) -> User:
    """Org admin for team governance demos."""
    user = (
        await db.execute(select(User).where(User.email == DEMO_MANAGER_EMAIL))
    ).scalar_one_or_none()
    if user is None:
        user = User(
            email=DEMO_MANAGER_EMAIL,
            full_name="Demo Program Manager",
            hashed_password=hash_password(DEMO_PASSWORD),
            role="government",
            organization_id=org.id,
            org_role="manager",
            is_org_admin=True,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.full_name = "Demo Program Manager"
        user.hashed_password = hash_password(DEMO_PASSWORD)
        user.role = "government"
        user.organization_id = org.id
        user.org_role = "manager"
        user.is_org_admin = True
        user.is_active = True
        user.is_verified = True

    org.owner_user_id = user.id

    gov = await get_program_by_code(db, "government_nhai")
    if gov is not None:
        await set_user_programs(db, user.id, [default_program_code(), gov.code])

    meta = dict(org.metadata_ or {})
    codes = list(meta.get("program_codes") or [])
    if gov is not None and gov.code not in codes:
        codes.append(gov.code)
    meta["program_codes"] = codes
    org.metadata_ = meta
    org.type = "government"

    return user


async def _ensure_demo_viewer(db, org: Organization) -> User:
    """Read-only org viewer for RBAC demos (professional nav, no mutations)."""
    user = (
        await db.execute(select(User).where(User.email == DEMO_VIEWER_EMAIL))
    ).scalar_one_or_none()
    if user is None:
        user = User(
            email=DEMO_VIEWER_EMAIL,
            full_name="Demo Viewer",
            hashed_password=hash_password(DEMO_PASSWORD),
            role="government",
            organization_id=org.id,
            org_role="viewer",
            is_org_admin=False,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.full_name = "Demo Viewer"
        user.hashed_password = hash_password(DEMO_PASSWORD)
        user.role = "government"
        user.organization_id = org.id
        user.org_role = "viewer"
        user.is_org_admin = False
        user.is_active = True
        user.is_verified = True

    gov = await get_program_by_code(db, "government_nhai")
    if gov is not None:
        await set_user_programs(db, user.id, [default_program_code(), gov.code])

    return user


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
    )


async def _next_public_code(db, prefix: str) -> str:
    """Return the next unused demo code for a prefix like BYOT-DEMO or NHAI-DEMO."""
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
                .where(Tree.organization_id == org.id)
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


async def _ensure_demo_scheme_projects(db, *, org: Organization, manager: User) -> dict[str, int]:
    """Create sample Nagar Van and Sahakar Van projects for scheme onboarding demos."""
    from app.models.planting_project import PlantingProject
    from app.services.planting_projects.service import create_standard_from_template
    from app.services.planting_projects.templates import template_for_segment
    from app.services.schemes.compliance import seed_project_scheme_checklists
    from app.services.schemes.registry import get_scheme
    from app.services.schemes.resolution import apply_scheme_defaults

    specs = [
        {
            "code": "DEMO-NAGAR-VAN",
            "name": "Demo — Indore Urban Forest Block A",
            "scheme_code": "nagar_van",
            "program_code": "government_nhai",
            "target_tree_count": 10000,
            "scheme_refs": {
                "nagar_van_project_id": "NV-MP-INDORE-DEMO",
                "ulb_name": "Indore Municipal Corporation",
                "urban_forest_name": "Chiman Bagh Urban Forest Block A",
                "target_trees": 10000,
            },
        },
        {
            "code": "DEMO-SAHAKAR-VAN",
            "name": "Demo — Sumel Sahakar Van (Jaipur)",
            "scheme_code": "sahakar_van",
            "program_code": "government_nhai",
            "target_tree_count": None,
            "scheme_refs": {
                "sahakar_van_project_id": "SV-NCCF-RAJ-DEMO",
                "nccf_project_ref": "NCCF/SV/2026/SUMEL",
                "amul_union_name": "GCMMF — Amul",
                "cooperative_society_name": "Sumel Mahila Mandal",
                "village_name": "Sumel",
                "district": "Jaipur",
                "state_name": "Rajasthan",
                "site_area_acres": 64,
                "plantation_method": "mixed",
                "target_trees": 50000,
            },
        },
    ]

    created = 0
    existing = 0
    for spec in specs:
        row = (
            await db.execute(
                select(PlantingProject).where(
                    PlantingProject.organization_id == org.id,
                    PlantingProject.code == spec["code"],
                )
            )
        ).scalar_one_or_none()
        if row is not None:
            existing += 1
            continue

        scheme = get_scheme(spec["scheme_code"])
        if scheme is None:
            continue

        segment, compliance, template_code = apply_scheme_defaults(
            scheme=scheme,
            segment="general",
            compliance_mode="guided",
            program_code=spec["program_code"],
            standard_template_code=None,
        )
        if not template_code:
            template_code = template_for_segment(segment)["code"]

        project = PlantingProject(
            code=spec["code"],
            name=spec["name"],
            description=f"Demo planting project under {scheme['label']}.",
            segment=segment,
            compliance_mode=compliance,
            status="active",
            program_code=spec["program_code"],
            scheme_code=spec["scheme_code"],
            standard_template_code=template_code,
            target_tree_count=spec["target_tree_count"],
            organization_id=org.id,
            owner_user_id=manager.id,
            metadata_={"scheme_refs": spec["scheme_refs"], "demo": True},
        )
        db.add(project)
        await db.flush()
        await create_standard_from_template(db, project=project, template_code=template_code)
        await seed_project_scheme_checklists(db, project)
        created += 1

    return {"created": created, "existing": existing}


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

        stats = await _rebalance_demo_portfolios(db, citizen=citizen, manager=manager, org=org)
        scheme_stats = await _ensure_demo_scheme_projects(db, org=org, manager=manager)

        await db.commit()
        print(
            f"Demo data ready. Password for all: {DEMO_PASSWORD}\n"
            f"  Citizen (personal BYOT): {DEMO_EMAIL} -> {stats['citizen_personal']} trees\n"
            f"  Org admin (NHAI portfolio): {DEMO_MANAGER_EMAIL} -> {stats['org_portfolio']} trees\n"
            f"  Viewer (read-only org): {DEMO_VIEWER_EMAIL}\n"
            f"  Scheme demo projects created: {scheme_stats['created']} "
            f"(existing {scheme_stats['existing']})\n"
            f"  Rebalance: detached {stats['citizen_detached_from_org']} citizen trees from org, "
            f"created {stats['citizen_created']} citizen + {stats['org_created']} org trees"
        )


if __name__ == "__main__":
    asyncio.run(seed())
