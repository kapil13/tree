"""Transactional email delivery for Aranyix."""

from app.services.email.config import (
    email_otp_configured,
    email_public_config,
    invite_email_configured,
    program_access_email_configured,
    resend_configured,
)
from app.services.email.exceptions import EmailSendError
from app.services.email.service import (
    send_login_otp,
    send_organization_invitation,
    send_password_reset,
    send_program_access_admin_email,
    send_program_access_decision_email,
    send_security_notification,
    send_verification_otp,
)

__all__ = [
    "EmailSendError",
    "email_otp_configured",
    "email_public_config",
    "invite_email_configured",
    "program_access_email_configured",
    "resend_configured",
    "send_login_otp",
    "send_organization_invitation",
    "send_password_reset",
    "send_program_access_admin_email",
    "send_program_access_decision_email",
    "send_security_notification",
    "send_verification_otp",
]
