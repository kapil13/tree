#!/usr/bin/env bash
# =============================================================================
# Provision kapil@axentis.tech for NHAI / Govt signup — run ON THE VPS as root.
#
# Copy this entire file to the server, then:
#   chmod +x vps-provision-kapil-nhai.sh
#   PROVISION_USER_PASSWORD='YourSecurePassword12!' ./vps-provision-kapil-nhai.sh
#
# No git pull required — uses Python modules already inside the backend container.
# =============================================================================
set -euo pipefail

EMAIL="${PROVISION_EMAIL:-kapil@axentis.tech}"
PHONE="${PROVISION_PHONE:-7014376403}"
FULL_NAME="${PROVISION_FULL_NAME:-Kapil Axentis}"
ORG_NAME="${PROVISION_ORG_NAME:-Axentis NHAI Pilot}"
PASSWORD="${PROVISION_USER_PASSWORD:-}"

HOSTINGER_DIR="${HOSTINGER_DIR:-/opt/aranyix/infrastructure/hostinger}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [[ -z "$PASSWORD" ]]; then
  echo "ERROR: Set PROVISION_USER_PASSWORD (min 12 characters)."
  echo "  Example: PROVISION_USER_PASSWORD='AxentisKapil2026!' ./vps-provision-kapil-nhai.sh"
  exit 1
fi
if [[ ${#PASSWORD} -lt 12 ]]; then
  echo "ERROR: PROVISION_USER_PASSWORD must be at least 12 characters."
  exit 1
fi

if [[ ! -d "$HOSTINGER_DIR" ]]; then
  echo "ERROR: Hostinger dir not found: $HOSTINGER_DIR"
  echo "  Set HOSTINGER_DIR if your repo lives elsewhere."
  exit 1
fi

cd "$HOSTINGER_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Missing $HOSTINGER_DIR/$ENV_FILE"
  exit 1
fi

echo "==> Using compose: $HOSTINGER_DIR/$COMPOSE_FILE"
echo "==> Provisioning $EMAIL (phone $PHONE) for government_nhai..."

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend python - <<PY
import asyncio
import json
import os
import sys
from datetime import UTC, datetime

from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.planting_program import ProgramAccessRequest, UserPlantingProgram
from app.models.user import User
from app.services.auth.otp import normalize_phone
from app.services.planting_programs.enrollment import ensure_default_enrollment, get_program_by_code
from app.services.planting_programs.onboarding import OrgProfileIn, submit_org_profile

EMAIL = ${EMAIL@Q}
PHONE = ${PHONE@Q}
FULL_NAME = ${FULL_NAME@Q}
ORG_NAME = ${ORG_NAME@Q}
PASSWORD = ${PASSWORD@Q}
PROGRAM_CODE = "government_nhai"

async def main() -> int:
    email_lower = EMAIL.lower().strip()
    phone = normalize_phone(PHONE)
    now = datetime.now(UTC)

    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email == email_lower))
        ).scalar_one_or_none()

        if user is None:
            taken = (
                await db.execute(select(User.id).where(User.phone == phone))
            ).scalar_one_or_none()
            if taken:
                print(f"ERROR: phone {phone} already used", file=sys.stderr)
                return 1
            user = User(
                email=email_lower,
                phone=phone,
                full_name=FULL_NAME.strip(),
                hashed_password=hash_password(PASSWORD),
                role="user",
                is_active=True,
                is_verified=True,
                phone_verified_at=now,
                email_verified_at=now,
            )
            db.add(user)
            await db.flush()
            print(f"CREATED user {email_lower} id={user.id}")
        else:
            user.full_name = FULL_NAME.strip()
            user.phone = phone
            user.hashed_password = hash_password(PASSWORD)
            user.is_active = True
            user.is_verified = True
            user.phone_verified_at = now
            user.email_verified_at = now
            if user.organization_id is None:
                user.role = "user"
            print(f"UPDATED user {email_lower} id={user.id}")

        await ensure_default_enrollment(db, user.id)

        program = await get_program_by_code(db, PROGRAM_CODE)
        if program is None:
            print(f"ERROR: planting program {PROGRAM_CODE!r} missing — run alembic upgrade head", file=sys.stderr)
            return 1

        # Do not pre-enroll NHAI — admin approval adds it.
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
        if request is None:
            request = ProgramAccessRequest(
                user_id=user.id,
                program_id=program.id,
                status="draft",
            )
            db.add(request)
            await db.flush()
            print(f"CREATED access request id={request.id}")
        else:
            request.status = "draft"
            request.admin_note = None
            request.reviewed_by = None
            request.reviewed_at = None
            print(f"RESET access request id={request.id} to draft")

        profile = OrgProfileIn(
            organization_name=ORG_NAME,
            organization_type="government",
            designation="Program Manager",
            city="New Delhi",
            state="Delhi",
            country="IN",
            work_email=email_lower,
            contact_phone=phone,
            use_case_summary=(
                "NHAI highway plantation monitoring and compliance evidence "
                "for Axentis pilot deployment."
            ),
        )

        await submit_org_profile(db, user_id=user.id, profile=profile)
        await db.commit()
        await db.refresh(request)

        pending_count = (
            await db.execute(
                text(
                    "SELECT count(*) FROM program_access_requests WHERE status = 'pending'"
                )
            )
        ).scalar_one()

        row = (
            await db.execute(
                text(
                    """
                    SELECT r.id, r.status, r.org_profile IS NOT NULL AS has_profile,
                           u.email, p.code
                    FROM program_access_requests r
                    JOIN users u ON u.id = r.user_id
                    JOIN planting_programs p ON p.id = r.program_id
                    WHERE u.email = :email
                    ORDER BY r.created_at DESC
                    LIMIT 1
                    """
                ),
                {"email": email_lower},
            )
        ).mappings().first()

        report = {
            "email": email_lower,
            "phone": phone,
            "password_set": True,
            "user_id": str(user.id),
            "access_request_id": str(request.id),
            "access_request_status": request.status,
            "has_org_profile": request.org_profile is not None,
            "program_code": PROGRAM_CODE,
            "total_pending_in_queue": int(pending_count),
            "admin_api": "GET /api/v1/platform/program-access-requests?status=pending",
            "admin_ui_hint": "Platform Admin → Program access → Pending tab",
        }
        print("")
        print("=== SUCCESS ===")
        print(json.dumps(report, indent=2))
        if row:
            print("")
            print("=== DB ROW (latest for this email) ===")
            print(dict(row))
        if request.status != "pending" or not request.org_profile:
            print("WARNING: request should be pending with org_profile — check admin UI filters", file=sys.stderr)
            return 1
        return 0

raise SystemExit(asyncio.run(main()))
PY

echo ""
echo "==> Done. Sign in at https://aranyix.tech/auth"
echo "    Email:    $EMAIL"
echo "    Password: (value you set in PROVISION_USER_PASSWORD)"
echo ""
echo "==> Approve in admin: Platform → Program access requests → Pending"
echo "    Or API: GET /api/v1/platform/program-access-requests?status=pending"
