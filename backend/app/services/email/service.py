"""Central transactional email service (Resend-backed)."""

from __future__ import annotations

from app.core.logging import get_logger
from app.services.email import templates
from app.services.email.config import (
    email_otp_configured,
    invite_email_configured,
    program_access_email_configured,
    resend_configured,
)
from app.services.email.exceptions import EmailSendError
from app.services.email.resend_provider import send_email

log = get_logger("email.service")


async def _send_template(
    *,
    to: str,
    subject: str,
    text: str,
    html: str,
    log_event: str,
    **log_fields: object,
) -> None:
    if not resend_configured():
        raise EmailSendError("email_not_configured")
    await send_email(to=to, subject=subject, html=html, text=text)
    log.info(log_event, to=_redact_email(to), **log_fields)


async def send_verification_otp(*, to: str, code: str) -> None:
    if not email_otp_configured():
        raise EmailSendError("email_otp_not_configured")
    subject, text, html = templates.verification_otp_email(code=code)
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.verification_otp_sent",
    )


async def send_login_otp(*, to: str, code: str) -> None:
    if not email_otp_configured():
        raise EmailSendError("email_otp_not_configured")
    subject, text, html = templates.login_otp_email(code=code)
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.login_otp_sent",
    )


async def send_password_reset(*, to: str, code: str) -> None:
    if not email_otp_configured():
        raise EmailSendError("email_otp_not_configured")
    subject, text, html = templates.password_reset_email(code=code)
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.password_reset_sent",
    )


async def send_organization_invitation(
    *,
    to: str,
    org_name: str,
    org_role: str,
    invite_link: str,
    full_name: str,
) -> None:
    if not invite_email_configured():
        raise EmailSendError("email_not_configured")
    subject, text, html = templates.organization_invitation_email(
        full_name=full_name,
        org_name=org_name,
        org_role=org_role,
        invite_link=invite_link,
    )
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.org_invite_sent",
        org=org_name,
    )


async def send_security_notification(*, to: str, title: str, message: str) -> None:
    if not resend_configured():
        raise EmailSendError("email_not_configured")
    subject, text, html = templates.security_notification_email(title=title, message=message)
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.security_notification_sent",
        title=title,
    )


async def send_program_access_admin_email(
    *,
    to: str,
    applicant_name: str,
    applicant_email: str,
    program_name: str,
    organization_name: str | None,
    queue_url: str,
) -> None:
    if not program_access_email_configured():
        raise EmailSendError("email_not_configured")
    subject, text, html = templates.program_access_admin_email(
        applicant_name=applicant_name,
        applicant_email=applicant_email,
        program_name=program_name,
        organization_name=organization_name,
        queue_url=queue_url,
    )
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.program_access_admin_sent",
        program=program_name,
    )


async def send_program_access_decision_email(
    *,
    to: str,
    applicant_name: str,
    program_name: str,
    action: str,
    admin_note: str | None,
    dashboard_url: str,
    pending_url: str,
) -> None:
    if not program_access_email_configured():
        raise EmailSendError("email_not_configured")
    subject, text, html = templates.program_access_decision_email(
        applicant_name=applicant_name,
        program_name=program_name,
        action=action,
        admin_note=admin_note,
        dashboard_url=dashboard_url,
        pending_url=pending_url,
    )
    await _send_template(
        to=to,
        subject=subject,
        text=text,
        html=html,
        log_event="email.program_access_decision_sent",
        action=action,
    )


def _redact_email(email: str) -> str:
    user, _, domain = email.partition("@")
    if not domain:
        return "***"
    return f"{user[:2]}***@{domain}"
