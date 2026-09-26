"""Email notifications for professional program access onboarding."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import Permission, has_permission
from app.models.planting_program import ProgramAccessRequest
from app.models.user import User
from app.services.auth.gmail_sender import (
    GmailSendError,
    gmail_program_access_configured,
    send_program_access_admin_email,
    send_program_access_decision_email,
)
from app.services.platform.modules import (
    PROGRAM_ACCESS_ADMIN_MODULE,
    get_module_rule,
)

log = get_logger("planting_programs.access_notify")


def program_access_queue_url() -> str:
    return f"{settings.app_frontend_url}/platform/program-access"


def onboarding_pending_url() -> str:
    return f"{settings.app_frontend_url}/onboarding/pending"


async def list_program_access_notifier_emails(db: AsyncSession) -> list[str]:
    """Active users who can review the program access queue."""
    rule = await get_module_rule(db, PROGRAM_ACCESS_ADMIN_MODULE)
    allowed_roles = set(rule.allowed_roles or []) if rule and rule.enabled else set()
    allowed_roles.add("admin")

    res = await db.execute(
        select(User.email, User.role).where(User.is_active.is_(True))
    )
    emails: list[str] = []
    seen: set[str] = set()
    for email, role in res.all():
        if not email:
            continue
        if role == "admin" or has_permission(role, Permission.ADMIN_ALL):
            pass
        elif role not in allowed_roles:
            continue
        key = email.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        emails.append(email.strip())
    return emails


async def notify_admins_new_access_request(
    db: AsyncSession,
    *,
    request: ProgramAccessRequest,
) -> dict[str, bool | int | str]:
    """Notify platform reviewers that a new access request is pending."""
    user = request.user
    program = request.program
    if user is None or program is None:
        return {"email_sent": False, "admin_count": 0}

    admin_emails = await list_program_access_notifier_emails(db)
    if not admin_emails:
        log.info("access_notify.no_admins", request_id=str(request.id))
        return {"email_sent": False, "admin_count": 0}

    org_name = None
    if request.org_profile and isinstance(request.org_profile, dict):
        org_name = request.org_profile.get("organization_name")

    if not gmail_program_access_configured():
        log.info(
            "access_notify.email_pending_keys",
            request_id=str(request.id),
            admin_count=len(admin_emails),
            queue_url=program_access_queue_url(),
        )
        return {"email_sent": False, "admin_count": len(admin_emails)}

    sent = 0
    for email in admin_emails:
        try:
            await send_program_access_admin_email(
                to=email,
                applicant_name=user.full_name,
                applicant_email=user.email,
                program_name=str(program.name),
                organization_name=str(org_name) if org_name else None,
                queue_url=program_access_queue_url(),
            )
            sent += 1
        except GmailSendError as exc:
            log.warning(
                "access_notify.admin_email_failed",
                code=exc.code,
                request_id=str(request.id),
            )

    return {"email_sent": sent > 0, "admin_count": len(admin_emails), "emails_sent": sent}


async def notify_user_access_request_decision(
    *,
    request: ProgramAccessRequest,
    action: str,
) -> dict[str, bool]:
    """Notify the applicant when their request is approved or rejected."""
    user = request.user
    program = request.program
    if user is None or program is None or not user.email:
        return {"email_sent": False}

    if action not in {"approve", "reject"}:
        return {"email_sent": False}

    if not gmail_program_access_configured():
        log.info(
            "access_notify.user_email_pending_keys",
            request_id=str(request.id),
            action=action,
            user_email=user.email,
        )
        return {"email_sent": False}

    try:
        await send_program_access_decision_email(
            to=user.email,
            applicant_name=user.full_name,
            program_name=str(program.name),
            action=action,
            admin_note=request.admin_note,
            dashboard_url=settings.app_frontend_url,
            pending_url=onboarding_pending_url(),
        )
        return {"email_sent": True}
    except GmailSendError as exc:
        log.warning(
            "access_notify.user_email_failed",
            code=exc.code,
            request_id=str(request.id),
            action=action,
        )
        return {"email_sent": False}
