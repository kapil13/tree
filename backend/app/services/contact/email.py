"""Contact inquiry email delivery (AWS SES with dev log fallback)."""

from __future__ import annotations

import asyncio
from html import escape

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.contact import ContactInquiryCreate

log = get_logger("contact.email")

ORGANIZATION_TYPE_LABELS = {
    "corporate_esg": "Corporate ESG",
    "government": "Government / public sector",
    "mining": "Mining & industrial reclamation",
    "ngo": "NGO / community",
    "international": "International donor / verifier",
    "other": "Other",
}

LAND_HECTARES_LABELS = {
    "under_100": "Under 100 ha",
    "100_1000": "100 - 1,000 ha",
    "1000_10000": "1,000 - 10,000 ha",
    "over_10000": "10,000+ ha",
}

SITE_COUNT_LABELS = {
    "1": "1 site",
    "2_10": "2 - 10 sites",
    "11_50": "11 - 50 sites",
    "50_plus": "50+ sites",
}


class ContactEmailError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _label(mapping: dict[str, str], key: str) -> str:
    return mapping.get(key, key.replace("_", " ").title())


def _build_email(payload: ContactInquiryCreate) -> tuple[str, str, str]:
    org_type = _label(ORGANIZATION_TYPE_LABELS, payload.organization_type.value)
    hectares = _label(LAND_HECTARES_LABELS, payload.land_hectares_band.value)
    sites = _label(SITE_COUNT_LABELS, payload.site_count_band.value)
    subject = f"Aranyix contact inquiry — {payload.organization}"
    text = (
        "New contact inquiry from the Aranyix website\n\n"
        f"Name: {payload.full_name}\n"
        f"Email: {payload.email}\n"
        f"Phone: {payload.phone}\n"
        f"Organization: {payload.organization}\n"
        f"Organization type: {org_type}\n"
        f"State / region: {payload.state}\n"
        f"Land under management: {hectares}\n"
        f"Number of sites: {sites}\n\n"
        f"Message:\n{payload.message}\n"
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#1A1F24;">
  <h2 style="color:#1B5E3B;">New Aranyix contact inquiry</h2>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
    <tr><td><strong>Name</strong></td><td>{escape(payload.full_name)}</td></tr>
    <tr><td><strong>Email</strong></td><td>{escape(str(payload.email))}</td></tr>
    <tr><td><strong>Phone</strong></td><td>{escape(payload.phone)}</td></tr>
    <tr><td><strong>Organization</strong></td><td>{escape(payload.organization)}</td></tr>
    <tr><td><strong>Organization type</strong></td><td>{escape(org_type)}</td></tr>
    <tr><td><strong>State / region</strong></td><td>{escape(payload.state)}</td></tr>
    <tr><td><strong>Land under management</strong></td><td>{escape(hectares)}</td></tr>
    <tr><td><strong>Number of sites</strong></td><td>{escape(sites)}</td></tr>
  </table>
  <h3>Message</h3>
  <p style="white-space:pre-wrap;">{escape(payload.message)}</p>
</body>
</html>"""
    return subject, text, html


def _send_email_sync(*, to: str, subject: str, text: str, html: str) -> None:
    client = boto3.client(
        "ses",
        region_name=settings.aws_region,
        endpoint_url=settings.ses_endpoint_url,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    client.send_email(
        Source=settings.contact_inquiry_from_email,
        Destination={"ToAddresses": [to]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text, "Charset": "UTF-8"},
                "Html": {"Data": html, "Charset": "UTF-8"},
            },
        },
        ReplyToAddresses=[settings.contact_inquiry_reply_to_email],
    )


async def send_contact_inquiry_email(payload: ContactInquiryCreate) -> None:
    to = settings.contact_inquiry_to_email.strip()
    if not to:
        raise ContactEmailError("contact_email_not_configured")

    subject, text, html = _build_email(payload)

    try:
        await asyncio.to_thread(
            _send_email_sync,
            to=to,
            subject=subject,
            text=text,
            html=html,
        )
        log.info(
            "contact.inquiry_sent",
            to=_redact_email(to),
            from_email=_redact_email(str(payload.email)),
            organization=payload.organization,
        )
    except (BotoCoreError, ClientError, Exception) as exc:
        log.warning("contact.send_failed", error=str(exc))
        if settings.app_env in {"production", "staging"}:
            raise ContactEmailError("contact_email_send_failed") from exc
        log.info(
            "contact.inquiry_dev_fallback",
            to=to,
            subject=subject,
            body=text,
        )


def _redact_email(email: str) -> str:
    user, _, domain = email.partition("@")
    if not domain:
        return "***"
    return f"{user[:2]}***@{domain}"
