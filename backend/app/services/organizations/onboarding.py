"""Organization onboarding helpers for program access approval."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.planting_program import ProgramAccessRequest
from app.models.user import User
from app.services.planting_programs.enrollment import list_user_program_codes, set_user_programs

ORG_ROLES = frozenset({"manager", "supervisor", "worker", "viewer"})
PROGRAM_PLATFORM_ROLES = {
    "government_nhai": "government",
    "corporate_esg": "corporate",
    "ngo_watershed": "ngo",
}
PROGRAM_ORG_TYPES = {
    "government_nhai": "government",
    "corporate_esg": "corporate",
    "ngo_watershed": "ngo",
}


class OrgOnboardingError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def slugify_org_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:60]
    return slug or "org"


def default_platform_role_for_program(program_code: str) -> str:
    return PROGRAM_PLATFORM_ROLES.get(program_code, "government")


def org_type_for_program(program_code: str) -> str:
    return PROGRAM_ORG_TYPES.get(program_code, "government")


def platform_role_for_org_member(org_role: str, org_type: str) -> str:
    if org_role == "supervisor":
        return "field_supervisor"
    if org_role == "worker":
        return "field_worker"
    if org_role == "viewer":
        return org_type if org_type in {"government", "corporate", "ngo"} else "government"
    return org_type if org_type in {"government", "corporate", "ngo"} else "government"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    slug = slugify_org_name(base)
    candidate = slug
    suffix = 1
    while True:
        existing = await db.execute(select(Organization.id).where(Organization.slug == candidate))
        if existing.scalar_one_or_none() is None:
            return candidate
        suffix += 1
        candidate = f"{slug}-{suffix}"


async def onboard_user_on_program_approval(
    db: AsyncSession,
    *,
    request: ProgramAccessRequest,
    user: User,
    organization_name: str | None = None,
    organization_slug: str | None = None,
    organization_id: uuid.UUID | None = None,
    platform_role: str | None = None,
    make_org_admin: bool = True,
) -> Organization:
    program_code = request.program.code
    role = platform_role or default_platform_role_for_program(program_code)

    if organization_id:
        org = await db.get(Organization, organization_id)
        if org is None:
            raise OrgOnboardingError("organization_not_found")
    else:
        name = (organization_name or f"{user.full_name} — {request.program.name}").strip()
        slug = organization_slug or await _unique_slug(db, name)
        if organization_slug:
            taken = await db.execute(select(Organization.id).where(Organization.slug == slug))
            if taken.scalar_one_or_none():
                raise OrgOnboardingError("organization_slug_taken")
        org = Organization(
            name=name,
            slug=slug,
            type=org_type_for_program(program_code),
            owner_user_id=user.id,
            metadata_={"program_codes": [program_code]},
        )
        db.add(org)
        await db.flush()

    meta = dict(org.metadata_ or {})
    codes = list(meta.get("program_codes") or [])
    if program_code not in codes:
        codes.append(program_code)
    meta["program_codes"] = codes
    org.metadata_ = meta
    if org.owner_user_id is None:
        org.owner_user_id = user.id

    user.organization_id = org.id
    user.role = role
    user.is_org_admin = make_org_admin
    user.org_role = "manager" if make_org_admin else user.org_role

    enrolled = await list_user_program_codes(db, user.id)
    if program_code not in enrolled:
        await set_user_programs(db, user.id, [*enrolled, program_code])

    return org


async def org_program_codes(org: Organization) -> list[str]:
    return list((org.metadata_ or {}).get("program_codes") or [])
