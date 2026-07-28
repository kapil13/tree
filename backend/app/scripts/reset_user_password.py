"""Set or reset a user's password by email (production admin utility)."""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def _reset_password(email: str, password: str) -> int:
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email == email.lower().strip()))
        ).scalar_one_or_none()
        if user is None:
            print(f"ERROR: no user with email {email!r}", file=sys.stderr)
            return 1
        user.hashed_password = hash_password(password)
        user.is_active = True
        user.is_verified = True
        await db.commit()
        print(f"Password updated for {email}.")
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Set or reset a user password by email")
    parser.add_argument("email", help="User email address")
    parser.add_argument(
        "--password",
        help="New password (or set RESET_USER_PASSWORD env var; otherwise prompted)",
    )
    args = parser.parse_args()

    password = args.password or os.environ.get("RESET_USER_PASSWORD")
    if not password:
        password = getpass.getpass("New password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("ERROR: passwords do not match", file=sys.stderr)
            raise SystemExit(1)
    if len(password) < 8:
        print("ERROR: password must be at least 8 characters", file=sys.stderr)
        raise SystemExit(1)

    raise SystemExit(asyncio.run(_reset_password(args.email, password)))


if __name__ == "__main__":
    main()
