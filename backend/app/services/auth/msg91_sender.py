"""MSG91 SMS for auth OTP and transactional org invites (India DLT)."""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("auth.msg91")

MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp"
MSG91_SMS_URL = "https://control.msg91.com/api/v5/flow/"


class SmsSendError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def sms_auth_configured() -> bool:
    return bool(settings.auth_otp_sms_enabled and settings.msg91_auth_key)


def sms_invites_configured() -> bool:
    return bool(settings.auth_org_invite_sms_enabled and settings.msg91_auth_key)


def _normalize_mobile(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if len(digits) == 10:
        return f"91{digits}"
    return digits


async def send_auth_otp_sms(*, phone: str, code: str) -> bool:
    """Send login/signup OTP. Returns True when dispatched, False in dev/stub mode."""
    if not sms_auth_configured():
        log.info("msg91.otp_stub", phone=_redact_phone(phone))
        return False

    mobile = _normalize_mobile(phone)
    headers = {"authkey": settings.msg91_auth_key or "", "Content-Type": "application/json"}
    payload: dict = {
        "mobile": mobile,
        "otp": code,
    }
    if settings.msg91_otp_template_id:
        payload["template_id"] = settings.msg91_otp_template_id
    if settings.msg91_sender_id:
        payload["sender"] = settings.msg91_sender_id

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(MSG91_OTP_URL, json=payload, headers=headers)
        if res.status_code >= 400:
            log.warning("msg91.otp_failed", status=res.status_code, body=res.text[:200])
            raise SmsSendError("msg91_otp_failed")
        log.info("msg91.otp_sent", phone=_redact_phone(phone))
        return True
    except httpx.HTTPError as exc:
        log.warning("msg91.otp_http_error", error=str(exc))
        raise SmsSendError("msg91_unreachable") from exc


async def send_transactional_sms(*, phone: str, message: str) -> bool:
    """Send invite or alert SMS. Uses Flow API when template id is set."""
    if not sms_invites_configured():
        log.info("msg91.sms_stub", phone=_redact_phone(phone), message_preview=message[:80])
        return False

    mobile = _normalize_mobile(phone)
    headers = {"authkey": settings.msg91_auth_key or "", "Content-Type": "application/json"}

    if settings.msg91_invite_template_id:
        payload = {
            "template_id": settings.msg91_invite_template_id,
            "recipients": [{"mobiles": mobile, "message": message}],
        }
    else:
        payload = {
            "sender": settings.msg91_sender_id or settings.sns_sms_sender_id,
            "route": "4",
            "sms": [{"message": message, "to": [mobile]}],
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(MSG91_SMS_URL, json=payload, headers=headers)
        if res.status_code >= 400:
            log.warning("msg91.sms_failed", status=res.status_code, body=res.text[:200])
            raise SmsSendError("msg91_sms_failed")
        log.info("msg91.sms_sent", phone=_redact_phone(phone))
        return True
    except httpx.HTTPError as exc:
        log.warning("msg91.sms_http_error", error=str(exc))
        raise SmsSendError("msg91_unreachable") from exc


def _redact_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 4:
        return "***"
    return f"***{digits[-4:]}"
