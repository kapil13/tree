"""Create or promote the first platform superadmin user."""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def main() -> int:
    parser = argparse.ArgumentParser(description="Bootstrap a superadmin user")
    parser.add_argument("--email", default=os.getenv("SUPERADMIN_EMAIL"))
    parser.add_argument("--password", default=os.getenv("SUPERADMIN_PASSWORD"))
    parser.add_argument("--name", default=os.getenv("SUPERADMIN_NAME", "Platform Superadmin"))
    parser.add_argument("--promote-existing", action="store_true")
    args = parser.parse_args()

    if not args.email:
        print("Provide --email or SUPERADMIN_EMAIL", file=sys.stderr)
        return 1

    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(User).where(User.email == args.email))
        if existing:
            if existing.role != "superadmin":
                existing.role = "superadmin"
                existing.is_active = True
                await db.commit()
                print(f"Promoted existing user {args.email} to superadmin")
            else:
                print(f"User {args.email} is already superadmin")
            return 0

        if not args.password:
            print("Provide --password or SUPERADMIN_PASSWORD for new users", file=sys.stderr)
            return 1

        user = User(
            email=args.email,
            full_name=args.name,
            hashed_password=hash_password(args.password),
            role="superadmin",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        print(f"Created superadmin {args.email}")
        return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
