"""Inspect a user's auth, enrollment, and onboarding state (production diagnostics)."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.planting_program import ProgramAccessRequest
from app.models.tree import Tree
from app.models.user import User
from app.services.planting_programs.access_requests import list_user_access_requests
from app.services.planting_programs.enrollment import (
    ensure_default_enrollment,
    list_user_program_codes,
)
from app.services.planting_programs.onboarding import (
    get_user_onboarding_state,
    repair_stale_onboarding_requests,
)


async def _inspect(email: str, *, repair: bool) -> int:
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email == email.lower().strip()))
        ).scalar_one_or_none()
        if user is None:
            print(f"ERROR: no user with email {email!r}", file=sys.stderr)
            return 1

        codes = await list_user_program_codes(db, user.id)
        if not codes:
            await ensure_default_enrollment(db, user.id)
            await db.flush()
            codes = await list_user_program_codes(db, user.id)

        requests = await list_user_access_requests(db, user.id)
        onboarding_before = await get_user_onboarding_state(db, user.id)
        tree_count = (
            await db.execute(
                select(func.count()).select_from(Tree).where(Tree.owner_user_id == user.id)
            )
        ).scalar_one()
        access_request_count = (
            await db.execute(
                select(func.count())
                .select_from(ProgramAccessRequest)
                .where(ProgramAccessRequest.user_id == user.id)
            )
        ).scalar_one()

        repaired = 0
        if repair:
            repaired = await repair_stale_onboarding_requests(db, user.id)
            if repaired:
                await db.commit()

        onboarding_after = await get_user_onboarding_state(db, user.id)

        report = {
            "email": user.email,
            "user_id": str(user.id),
            "role": user.role,
            "organization_id": str(user.organization_id) if user.organization_id else None,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "has_password": user.hashed_password is not None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "enrolled_program_codes": codes,
            "tree_count": tree_count,
            "access_request_count": access_request_count,
            "access_requests": [
                {
                    "id": str(req.id),
                    "status": req.status,
                    "program_code": req.program.code if req.program else None,
                    "has_org_profile": bool(req.org_profile),
                    "created_at": req.created_at.isoformat() if req.created_at else None,
                }
                for req in requests
            ],
            "onboarding_before": onboarding_before.model_dump(mode="json"),
            "repaired_requests": repaired,
            "onboarding_after": onboarding_after.model_dump(mode="json"),
        }
        print(json.dumps(report, indent=2))
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect user auth and onboarding state")
    parser.add_argument("email", help="User email address")
    parser.add_argument(
        "--repair",
        action="store_true",
        help="Withdraw stale incomplete professional access requests",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_inspect(args.email, repair=args.repair)))


if __name__ == "__main__":
    main()
