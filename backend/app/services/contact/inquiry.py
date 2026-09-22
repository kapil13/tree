"""Contact inquiry email delivery."""

from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.core.production_guards import is_hardened_env
from app.schemas.contact import ContactInquiryCreate
from app.services.email.config import resend_configured
from app.services.email.exceptions import EmailSendError
from app.services.email.service import send_contact_inquiry_notification

log = get_logger("contact.inquiry")


class ContactInquiryError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def deliver_contact_inquiry(payload: ContactInquiryCreate) -> None:
    to = settings.contact_inquiry_to_email.strip()
    if not to:
        raise ContactInquiryError("contact_email_not_configured")

    if not resend_configured():
        if is_hardened_env():
            raise ContactInquiryError("contact_email_not_configured")
        log.info(
            "contact.inquiry_dev_fallback",
            to=to,
            from_email=str(payload.email),
            organization=payload.organization,
            message=payload.message,
        )
        return

    try:
        await send_contact_inquiry_notification(to=to, inquiry=payload)
    except EmailSendError as exc:
        log.warning("contact.send_failed", error=exc.code)
        raise ContactInquiryError("contact_email_send_failed") from exc

    log.info(
        "contact.inquiry_sent",
        to=_redact_email(to),
        from_email=_redact_email(str(payload.email)),
        organization=payload.organization,
    )


def _redact_email(email: str) -> str:
    user, _, domain = email.partition("@")
    if not domain:
        return "***"
    return f"{user[:2]}***@{domain}"
