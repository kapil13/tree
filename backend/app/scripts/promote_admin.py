"""Promote a user to platform admin by email."""

from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User


async def _promote(email: str) -> int:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email.lower().strip()))).scalar_one_or_none()
        if user is None:
            print(f"ERROR: no user with email {email!r}", file=sys.stderr)
            return 1
        if user.role == "admin":
            print(f"User {email} is already platform admin.")
            return 0
        prev = user.role
        user.role = "admin"
        await db.commit()
        print(f"Promoted {email} from {prev!r} to admin.")
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote a user to platform admin")
    parser.add_argument("email", help="User email address")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_promote(args.email)))


if __name__ == "__main__":
    main()
