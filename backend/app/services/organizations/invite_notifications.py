"""Outbound email/SMS when org admins invite team members."""

from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.models.organization import Organization
from app.models.organization_invite import OrganizationInvite
from app.services.auth.gmail_sender import (
    GmailSendError,
    gmail_invite_configured,
    send_org_invite_email,
)
from app.services.auth.msg91_sender import (
    SmsSendError,
    send_transactional_sms,
    sms_invites_configured,
)

log = get_logger("org.invite_notify")

ROLE_LABELS = {
    "manager": "Program manager",
    "supervisor": "Field supervisor",
    "worker": "Field worker",
    "viewer": "Viewer / auditor",
}


def invite_link(token: str) -> str:
    return f"{settings.app_frontend_url}/auth?invite={token}"


def invite_sms_body(*, org_name: str, org_role: str, link: str) -> str:
    role = ROLE_LABELS.get(org_role, org_role.replace("_", " "))
    return (
        f"You are invited to {org_name} on Aranyix as {role}. "
        f"Open this link to join: {link}"
    )


async def notify_org_invite(
    *,
    invite: OrganizationInvite,
    org: Organization,
) -> dict[str, bool | str]:
    """Send invite notifications. Returns delivery status for admin UI."""
    link = invite_link(invite.invite_token)
    sms_sent = False
    email_sent = False

    if invite.phone:
        if sms_invites_configured():
            try:
                sms_sent = await send_transactional_sms(
                    phone=invite.phone,
                    message=invite_sms_body(
                        org_name=org.name,
                        org_role=invite.org_role,
                        link=link,
                    ),
                )
            except SmsSendError as exc:
                log.warning("invite.sms_failed", code=exc.code, invite_id=str(invite.id))
        else:
            log.info(
                "invite.sms_pending_keys",
                phone=invite.phone[-4:] if invite.phone else None,
                link=link,
            )

    if invite.email:
        if gmail_invite_configured():
            try:
                await send_org_invite_email(
                    to=invite.email,
                    org_name=org.name,
                    org_role=invite.org_role,
                    invite_link=link,
                    full_name=invite.full_name,
                )
                email_sent = True
            except GmailSendError as exc:
                log.warning("invite.email_failed", code=exc.code, invite_id=str(invite.id))
        else:
            log.info("invite.email_pending_keys", email=invite.email, link=link)

    return {"sms_sent": sms_sent, "email_sent": email_sent, "invite_link": link}
