"""Provision a verified professional signup user (e.g. NHAI) pending admin approval.

Run on VPS:
  docker compose -f infrastructure/hostinger/docker-compose.prod.yml \\
    --env-file infrastructure/hostinger/.env.production \\
    exec -T backend python -m app.scripts.provision_professional_user \\
      --email kapil@axentis.tech \\
      --phone 7014376403 \\
      --full-name "Kapil Axentis" \\
      --category government_nhai \\
      --org-name "Axentis NHAI Pilot" \\
      --password 'YourSecurePassword12!'
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.planting_program import ProgramAccessRequest, UserPlantingProgram
from app.models.user import User
from app.services.auth.otp import normalize_phone
from app.services.planting_programs.enrollment import ensure_default_enrollment, get_program_by_code
from app.services.planting_programs.onboarding import OrgProfileIn, submit_org_profile
from app.services.planting_programs.signup_categories import program_code_for_signup_category


async def _provision(
    *,
    email: str,
    phone: str,
    full_name: str,
    password: str,
    signup_category: str,
    org_name: str,
    designation: str,
    city: str,
    state: str,
    use_case_summary: str,
    pending: bool,
) -> int:
    email_lower = email.lower().strip()
    normalized_phone = normalize_phone(phone)
    program_code = program_code_for_signup_category(signup_category)
    if program_code is None:
        print("ERROR: signup category must be a professional program (government_nhai, etc.)", file=sys.stderr)
        return 1

    now = datetime.now(UTC)

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(User).where(User.email == email_lower))
        ).scalar_one_or_none()
        if existing is not None:
            user = existing
            user.full_name = full_name.strip()
            user.phone = normalized_phone
            user.hashed_password = hash_password(password)
            user.is_active = True
            user.is_verified = True
            user.phone_verified_at = now
            user.email_verified_at = now
            if user.organization_id is None:
                user.role = "user"
            print(f"Updated existing user {email_lower}")
        else:
            phone_taken = (
                await db.execute(select(User.id).where(User.phone == normalized_phone))
            ).scalar_one_or_none()
            if phone_taken is not None:
                print(f"ERROR: phone {normalized_phone!r} already used by another user", file=sys.stderr)
                return 1

            user = User(
                email=email_lower,
                phone=normalized_phone,
                full_name=full_name.strip(),
                hashed_password=hash_password(password),
                role="user",
                is_active=True,
                is_verified=True,
                phone_verified_at=now,
                email_verified_at=now,
            )
            db.add(user)
            await db.flush()
            print(f"Created user {email_lower} ({user.id})")

        await ensure_default_enrollment(db, user.id)

        program = await get_program_by_code(db, program_code)
        if program is None:
            print(f"ERROR: program {program_code!r} not found — run migrations/seed", file=sys.stderr)
            return 1

        await db.execute(
            UserPlantingProgram.__table__.delete().where(
                UserPlantingProgram.user_id == user.id,
                UserPlantingProgram.program_id == program.id,
            )
        )

        res = await db.execute(
            select(ProgramAccessRequest).where(
                ProgramAccessRequest.user_id == user.id,
                ProgramAccessRequest.program_id == program.id,
            )
        )
        request = res.scalar_one_or_none()

        profile = OrgProfileIn(
            organization_name=org_name,
            organization_type="government",
            designation=designation,
            city=city,
            state=state,
            country="IN",
            work_email=email_lower,
            contact_phone=normalized_phone,
            use_case_summary=use_case_summary,
        )

        if request is None:
            request = ProgramAccessRequest(
                user_id=user.id,
                program_id=program.id,
                status="draft",
            )
            db.add(request)
            await db.flush()
        else:
            request.status = "draft"
            request.admin_note = None
            request.reviewed_by = None
            request.reviewed_at = None

        if pending:
            await submit_org_profile(db, user_id=user.id, profile=profile)
            final_status = "pending"
        else:
            request.org_profile = profile.model_dump(mode="json")
            request.message = use_case_summary.strip()
            request.status = "draft"
            final_status = "draft"

        await db.commit()

        report = {
            "email": email_lower,
            "phone": normalized_phone,
            "user_id": str(user.id),
            "program_code": program_code,
            "access_request_status": final_status,
            "access_request_id": str(request.id),
            "can_sign_in": True,
            "email_verified": True,
            "phone_verified": True,
            "admin_queue": final_status == "pending",
        }
        print(json.dumps(report, indent=2))
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Provision NHAI/govt user pending admin approval")
    parser.add_argument("--email", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--full-name", default="Kapil Axentis")
    parser.add_argument("--password", default=os.environ.get("PROVISION_USER_PASSWORD"))
    parser.add_argument("--category", default="government_nhai")
    parser.add_argument("--org-name", default="Axentis NHAI Pilot")
    parser.add_argument("--designation", default="Program Manager")
    parser.add_argument("--city", default="New Delhi")
    parser.add_argument("--state", default="Delhi")
    parser.add_argument(
        "--use-case",
        default="NHAI highway plantation monitoring and compliance evidence for Axentis pilot deployment.",
    )
    parser.add_argument(
        "--draft-only",
        action="store_true",
        help="Leave access request in draft (default submits org profile → pending approval)",
    )
    args = parser.parse_args()

    password = args.password
    if not password:
        print("ERROR: set --password or PROVISION_USER_PASSWORD env var (min 12 chars)", file=sys.stderr)
        raise SystemExit(1)
    if len(password) < 12:
        print("ERROR: password must be at least 12 characters", file=sys.stderr)
        raise SystemExit(1)

    raise SystemExit(
        asyncio.run(
            _provision(
                email=args.email,
                phone=args.phone,
                full_name=args.full_name,
                password=password,
                signup_category=args.category,
                org_name=args.org_name,
                designation=args.designation,
                city=args.city,
                state=args.state,
                use_case_summary=args.use_case,
                pending=not args.draft_only,
            )
        )
    )


if __name__ == "__main__":
    main()
