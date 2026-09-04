"""Persist planting audience on organizations and draft access requests."""

from __future__ import annotations

from sqlalchemy.orm.attributes import flag_modified

from app.models.organization import Organization
from app.models.user import User
from app.services.auth.user_profile import PROFESSIONAL_PROGRAM_CODES, user_has_professional_program
from app.services.onboarding.audience import AudienceCode, AudienceError, normalize_audience
from app.services.planting_programs.onboarding import _latest_professional_request


async def get_user_planting_audience(db, user: User) -> AudienceCode | None:
    if user.organization_id:
        org = await db.get(Organization, user.organization_id)
        if org is not None:
            raw = (org.metadata_ or {}).get("audience")
            if raw:
                try:
                    return normalize_audience(str(raw))
                except AudienceError:
                    return None

    request = await _latest_professional_request(db, user.id)
    if request and request.org_profile:
        raw = request.org_profile.get("planting_audience")
        if raw:
            try:
                return normalize_audience(str(raw))
            except AudienceError:
                return None
    return None


async def user_needs_audience_onboarding(db, user: User, enrolled_codes: list[str]) -> bool:
    if await get_user_planting_audience(db, user) is not None:
        return False

    if user.organization_id and user_has_professional_program(enrolled_codes):
        return True

    request = await _latest_professional_request(db, user.id)
    if request is None:
        return False
    if request.program and request.program.code not in PROFESSIONAL_PROGRAM_CODES:
        return False
    return request.status in {"draft", "rejected"}


async def set_user_planting_audience(db, user: User, audience: str) -> AudienceCode:
    normalized = normalize_audience(audience)

    if user.organization_id:
        org = await db.get(Organization, user.organization_id)
        if org is None:
            raise AudienceError("organization_not_found")
        meta = dict(org.metadata_ or {})
        meta["audience"] = normalized
        org.metadata_ = meta
        flag_modified(org, "metadata_")
        await db.flush()
        return normalized

    request = await _latest_professional_request(db, user.id)
    if request is None or request.status not in {"draft", "rejected"}:
        raise AudienceError("onboarding_not_started")
    profile = dict(request.org_profile or {})
    profile["planting_audience"] = normalized
    request.org_profile = profile
    await db.flush()
    return normalized


def copy_audience_from_profile_to_org(org: Organization, org_profile: dict | None) -> None:
    if not org_profile:
        return
    raw = org_profile.get("planting_audience")
    if not raw:
        return
    try:
        audience = normalize_audience(str(raw))
    except AudienceError:
        return
    meta = dict(org.metadata_ or {})
    if meta.get("audience"):
        return
    meta["audience"] = audience
    org.metadata_ = meta
    flag_modified(org, "metadata_")
