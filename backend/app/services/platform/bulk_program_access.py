"""Bulk program access request review for platform admins."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.organizations.onboarding import (
    OrgOnboardingError,
    onboard_user_on_program_approval,
)
from app.services.planting_programs.access_notifications import notify_user_access_request_decision
from app.services.planting_programs.access_requests import (
    AccessRequestError,
    get_access_request,
    review_access_request,
)

BulkProgramAction = Literal["approve", "reject"]


class BulkProgramAccessError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _default_org_name(request) -> str:
    profile = request.org_profile or {}
    org_name = profile.get("organization_name")
    if isinstance(org_name, str) and org_name.strip():
        return org_name.strip()
    return f"{request.user.full_name} — {request.program.name}"


def _default_platform_role(program_code: str) -> str:
    code = program_code.lower()
    if "corporate" in code or "esg" in code:
        return "corporate"
    if "ngo" in code:
        return "ngo"
    return "government"


async def bulk_review_program_access(
    db: AsyncSession,
    *,
    request_ids: list[uuid.UUID],
    action: BulkProgramAction,
    reviewer: User,
    admin_note: str | None = None,
) -> dict[str, Any]:
    if not request_ids:
        raise BulkProgramAccessError("empty_selection")

    processed = 0
    skipped = 0
    details: list[dict[str, Any]] = []

    for request_id in request_ids:
        row = await get_access_request(db, request_id)
        if row is None:
            skipped += 1
            details.append({"request_id": str(request_id), "status": "not_found"})
            continue
        if row.status != "pending":
            skipped += 1
            details.append({"request_id": str(request_id), "status": "not_pending"})
            continue

        try:
            reviewed = await review_access_request(
                db,
                request_id=request_id,
                reviewer_id=reviewer.id,
                action=action,
                admin_note=admin_note,
            )
            if action == "approve":
                try:
                    await onboard_user_on_program_approval(
                        db,
                        request=row,
                        user=row.user,
                        organization_name=_default_org_name(row),
                        organization_slug=None,
                        organization_id=None,
                        platform_role=_default_platform_role(row.program.code),
                        make_org_admin=True,
                    )
                except OrgOnboardingError as exc:
                    skipped += 1
                    details.append(
                        {"request_id": str(request_id), "status": f"onboarding_failed:{exc.code}"}
                    )
                    continue
            processed += 1
            details.append({"request_id": str(request_id), "status": action})
            await notify_user_access_request_decision(request=reviewed, action=action)
        except AccessRequestError as exc:
            skipped += 1
            details.append({"request_id": str(request_id), "status": exc.code})

    return {"processed": processed, "skipped": skipped, "details": details}
