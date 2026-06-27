"""Seed the database with a demo organization, user, species catalog, and trees.

Run inside the container:
    python -m app.scripts.seed_demo
"""

from __future__ import annotations

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.species import Species
from app.models.tree import Tree
from app.models.user import User
from app.services.carbon.species_catalog import SPECIES_CATALOG


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Species catalog
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

        # Organization
        org = (
            await db.execute(select(Organization).where(Organization.slug == "demo-farm"))
        ).scalar_one_or_none()
        if org is None:
            org = Organization(name="Demo Farm", slug="demo-farm", type="farm")
            db.add(org)
            await db.flush()

        # User
        user = (
            await db.execute(select(User).where(User.email == "demo@byot.earth"))
        ).scalar_one_or_none()
        if user is None:
            user = User(
                email="demo@byot.earth",
                full_name="Demo Farmer",
                hashed_password=hash_password("byotdemo1234!"),
                role="farmer",
                organization_id=org.id,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()

        # 25 demo trees around Bangalore
        existing_count = (
            await db.execute(select(Tree).where(Tree.owner_user_id == user.id))
        ).scalars().all()
        if len(existing_count) >= 5:
            print("Demo trees already exist, skipping.")
            await db.commit()
            return

        rng = random.Random(42)
        for i in range(25):
            sp = rng.choice(SPECIES_CATALOG)
            lat = 12.9716 + rng.uniform(-0.05, 0.05)
            lon = 77.5946 + rng.uniform(-0.05, 0.05)
            wkt = f"POINT({lon} {lat})"
            t = Tree(
                public_code=f"BYOT-DEMO-{i:04d}",
                owner_user_id=user.id,
                organization_id=org.id,
                species_text=sp.common_name,
                planted_at=date.today() - timedelta(days=rng.randint(180, 1800)),
                location=wkt,
                altitude_m=rng.uniform(800, 950),
                accuracy_m=rng.uniform(2, 8),
                current_health=rng.choices(
                    ["healthy", "moderate", "unhealthy"], weights=[7, 2, 1]
                )[0],
                current_dbh_cm=rng.uniform(5, 30),
                current_height_m=rng.uniform(2, 12),
                current_canopy_m=rng.uniform(1, 6),
                current_carbon_kg=rng.uniform(20, 150),
                satellite_verified=rng.random() < 0.7,
                status="active",
            )
            db.add(t)
        await db.commit()
        print("Seeded demo data.")


if __name__ == "__main__":
    asyncio.run(seed())
