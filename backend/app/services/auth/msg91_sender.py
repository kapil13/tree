"""MSG91 SMS for auth OTP and transactional org invites (India DLT)."""

from __future__ import annotations

import json

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


def sms_auth_template_configured() -> bool:
    return bool(sms_auth_configured() and settings.msg91_otp_template_id)


def sms_signup_otp_configured() -> bool:
    return bool(sms_auth_configured() and settings.msg91_signup_otp_template_id)


def sms_invites_configured() -> bool:
    return bool(settings.auth_org_invite_sms_enabled and settings.msg91_auth_key)


def msg91_public_config() -> dict[str, bool]:
    """Non-secret MSG91 readiness flags for diagnostics and /auth/otp-config."""
    return {
        "sms_enabled": settings.auth_otp_sms_enabled,
        "sms_configured": sms_auth_configured(),
        "sms_template_configured": sms_auth_template_configured(),
        "sms_signup_template_configured": sms_signup_otp_configured(),
        "invite_sms_enabled": settings.auth_org_invite_sms_enabled,
        "invite_sms_configured": sms_invites_configured(),
    }


def _normalize_mobile(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if len(digits) == 10:
        return f"91{digits}"
    return digits


def _validate_msg91_mobile(mobile: str) -> None:
    """MSG91 expects 91 + 10-digit Indian mobile (12 digits total)."""
    if len(mobile) == 12 and mobile.startswith("91") and mobile[2] in "6789":
        return
    raise SmsSendError("invalid_mobile")


def _parse_msg91_json_response(body: str, *, api_label: str) -> dict:
    """Parse MSG91 JSON body; raise when API reports failure despite HTTP 200."""
    if not body.strip():
        return {}
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return {"raw": body[:200]}
    if not isinstance(data, dict):
        return {"raw": body[:200]}
    if data.get("type") == "error":
        message = str(data.get("message") or data.get("msg") or "msg91_error")
        log.warning(
            "msg91.api_rejected",
            api=api_label,
            message=message[:200],
            body=body[:200],
        )
        raise SmsSendError("msg91_otp_rejected")
    return data


async def _post_msg91(
    *,
    url: str,
    payload: dict,
    api_label: str,
    log_event: str,
    phone: str,
    mobile: str,
) -> dict:
    headers = {"authkey": settings.msg91_auth_key or "", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload, headers=headers)
        if res.status_code >= 400:
            log.warning(
                "msg91.api_failed",
                api=api_label,
                status=res.status_code,
                body=res.text[:200],
            )
            raise SmsSendError("msg91_otp_failed")
        parsed = _parse_msg91_json_response(res.text, api_label=api_label)
        request_id = parsed.get("request_id") or parsed.get("requestId")
        log.info(
            log_event,
            api=api_label,
            phone=_redact_phone(phone),
            mobile_suffix=mobile[-4:],
            request_id=request_id,
            msg91_type=parsed.get("type"),
        )
        return parsed
    except httpx.HTTPError as exc:
        log.warning("msg91.api_http_error", api=api_label, error=str(exc))
        raise SmsSendError("msg91_unreachable") from exc


async def _send_otp_via_flow(
    *,
    phone: str,
    code: str,
    template_id: str,
    template_var: str,
    log_event: str,
) -> bool:
    """Send OTP using Flow API so DLT variables (##numeric## / ##num##) are populated."""
    mobile = _normalize_mobile(phone)
    _validate_msg91_mobile(mobile)
    payload: dict = {
        "template_id": template_id,
        "recipients": [{"mobiles": mobile, template_var: code}],
    }
    if settings.msg91_sender_id:
        payload["sender"] = settings.msg91_sender_id
    await _post_msg91(
        url=MSG91_SMS_URL,
        payload=payload,
        api_label="flow",
        log_event=log_event,
        phone=phone,
        mobile=mobile,
    )
    return True


async def _send_otp_sms(
    *,
    phone: str,
    code: str,
    template_id: str | None,
    template_var: str | None,
    log_event: str,
) -> bool:
    if not sms_auth_configured():
        log.info("msg91.otp_stub", phone=_redact_phone(phone))
        return False

    mobile = _normalize_mobile(phone)
    _validate_msg91_mobile(mobile)

    # India DLT OTP templates use named variables (##numeric## signup, ##num## login),
    # not the default ##OTP## placeholder. Flow API maps recipient keys to template vars.
    if template_id and template_var:
        try:
            return await _send_otp_via_flow(
                phone=phone,
                code=code,
                template_id=template_id,
                template_var=template_var,
                log_event=log_event,
            )
        except SmsSendError as exc:
            log.warning(
                "msg91.flow_otp_fallback",
                reason=exc.code,
                template_id=template_id,
                template_var=template_var,
            )

    payload: dict = {
        "mobile": mobile,
        "otp": code,
        "otp_length": len(code),
    }
    if template_id:
        payload["template_id"] = template_id
    if template_var:
        payload[template_var] = code
    if settings.msg91_sender_id:
        payload["sender"] = settings.msg91_sender_id

    await _post_msg91(
        url=MSG91_OTP_URL,
        payload=payload,
        api_label="otp",
        log_event=log_event,
        phone=phone,
        mobile=mobile,
    )
    return True


async def send_auth_otp_sms(*, phone: str, code: str) -> bool:
    """Send login OTP using the login DLT template."""
    return await _send_otp_sms(
        phone=phone,
        code=code,
        template_id=settings.msg91_otp_template_id,
        template_var=settings.msg91_otp_template_var,
        log_event="msg91.login_otp_sent",
    )


async def send_signup_otp_sms(*, phone: str, code: str) -> bool:
    """Send signup phone OTP using the signup DLT template."""
    return await _send_otp_sms(
        phone=phone,
        code=code,
        template_id=settings.msg91_signup_otp_template_id,
        template_var=settings.msg91_signup_otp_template_var,
        log_event="msg91.signup_otp_sent",
    )


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
