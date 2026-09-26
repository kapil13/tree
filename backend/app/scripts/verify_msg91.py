"""MSG91 OTP readiness check — run inside backend container or locally with app env loaded."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from app.core.config import settings
from app.services.auth.msg91_sender import (
    SmsSendError,
    _normalize_mobile,
    _validate_msg91_mobile,
    msg91_public_config,
    send_auth_otp_sms,
    send_signup_otp_sms,
    sms_auth_configured,
    sms_signup_otp_configured,
)
from app.services.auth.ses_email_sender import ses_otp_configured


def _status_line(label: str, ok: bool, detail: str = "") -> str:
    mark = "OK" if ok else "MISSING"
    suffix = f" ({detail})" if detail else ""
    return f"  [{mark}] {label}{suffix}"


def print_config_report() -> int:
    msg91 = msg91_public_config()
    lines = [
        "MSG91 / OTP configuration",
        _status_line(
            "AUTH_OTP_SMS_ENABLED",
            msg91["sms_enabled"],
            str(settings.auth_otp_sms_enabled),
        ),
        _status_line(
            "MSG91_AUTH_KEY",
            bool(settings.msg91_auth_key),
            "set" if settings.msg91_auth_key else "empty",
        ),
        _status_line(
            "MSG91_OTP_TEMPLATE_ID (login)",
            bool(settings.msg91_otp_template_id),
            settings.msg91_otp_template_id or "empty (recommended for India DLT)",
        ),
        _status_line(
            "MSG91_SIGNUP_OTP_TEMPLATE_ID (signup)",
            bool(settings.msg91_signup_otp_template_id),
            settings.msg91_signup_otp_template_id or "empty (required for signup phone OTP)",
        ),
        _status_line(
            "MSG91_OTP_TEMPLATE_VAR (login DLT var)",
            bool(settings.msg91_otp_template_var),
            settings.msg91_otp_template_var,
        ),
        _status_line(
            "MSG91_SIGNUP_OTP_TEMPLATE_VAR (signup DLT var)",
            bool(settings.msg91_signup_otp_template_var),
            settings.msg91_signup_otp_template_var,
        ),
        _status_line(
            "MSG91_SENDER_ID",
            bool(settings.msg91_sender_id),
            settings.msg91_sender_id or "empty",
        ),
        _status_line("sms_configured (ready to send)", msg91["sms_configured"]),
        _status_line("sms_template_configured", msg91["sms_template_configured"]),
        _status_line("sms_signup_template_configured", msg91["sms_signup_template_configured"]),
        _status_line(
            "AUTH_OTP_EMAIL_ENABLED",
            settings.auth_otp_email_enabled,
        ),
        _status_line(
            "Resend email (RESEND_API_KEY + RESEND_FROM_EMAIL)",
            ses_otp_configured(),
            settings.resend_from_email or "empty",
        ),
        _status_line("dev_otp_allowed", settings.allow_dev_otp),
    ]
    print("\n".join(lines))
    if not msg91["sms_configured"] and not settings.allow_dev_otp:
        print(
            "\nERROR: Phone OTP will fail until AUTH_OTP_SMS_ENABLED=true and MSG91_AUTH_KEY is set.",
            file=sys.stderr,
        )
        return 1
    if msg91["sms_configured"] and not msg91["sms_template_configured"]:
        print(
            "\nWARN: MSG91_OTP_TEMPLATE_ID is empty — login phone OTP may fail India DLT checks.",
            file=sys.stderr,
        )
    if msg91["sms_configured"] and not msg91["sms_signup_template_configured"]:
        print(
            "\nWARN: MSG91_SIGNUP_OTP_TEMPLATE_ID is empty — signup phone OTP will fail until set.",
            file=sys.stderr,
        )
    return 0


def _validate_test_phone(phone: str) -> str:
    lowered = phone.strip().lower()
    if "digit" in lowered or lowered.startswith("your_"):
        print(
            f"ERROR: Replace placeholder {phone!r} with a real 10-digit mobile, e.g. ./verify-msg91.sh 9876543210",
            file=sys.stderr,
        )
        raise SystemExit(1)
    mobile = _normalize_mobile(phone)
    try:
        _validate_msg91_mobile(mobile)
    except SmsSendError:
        print(
            f"ERROR: Invalid phone {phone!r} (normalized to {mobile!r}). "
            "Use a 10-digit Indian mobile starting with 6/7/8/9.",
            file=sys.stderr,
        )
        raise SystemExit(1) from None
    return mobile


async def send_test_otp(phone: str, *, signup: bool = False) -> int:
    if signup:
        if not sms_signup_otp_configured():
            print("ERROR: Signup SMS not configured — set MSG91_SIGNUP_OTP_TEMPLATE_ID.", file=sys.stderr)
            return 1
        sender = send_signup_otp_sms
        label = "signup"
    else:
        if not sms_auth_configured():
            print("ERROR: SMS not configured — run config report first.", file=sys.stderr)
            return 1
        sender = send_auth_otp_sms
        label = "login"
    mobile = _validate_test_phone(phone)
    code = os.environ.get("MSG91_VERIFY_OTP", "123456")
    print(f"Sending test {label} OTP to {mobile} (code={code})...")
    try:
        sent = await sender(phone=phone, code=code)
    except SmsSendError as exc:
        print(f"ERROR: MSG91 send failed: {exc.code}", file=sys.stderr)
        return 1
    if sent:
        print(f"OK: MSG91 accepted the {label} OTP request (check phone and backend logs).")
        return 0
    print(f"WARN: send_{label}_otp_sms returned False (stub mode).", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify MSG91 OTP wiring")
    parser.add_argument(
        "--send-test",
        metavar="PHONE",
        help="Send a test login OTP to this phone (e.g. 9876543210 or +919876543210)",
    )
    parser.add_argument(
        "--send-signup-test",
        metavar="PHONE",
        help="Send a test signup OTP using MSG91_SIGNUP_OTP_TEMPLATE_ID",
    )
    parser.add_argument("--json", action="store_true", help="Print otp-config JSON only")
    args = parser.parse_args()

    if args.json:
        msg91 = msg91_public_config()
        print(
            json.dumps(
                {
                    **msg91,
                    "email_enabled": settings.auth_otp_email_enabled,
                    "email_configured": ses_otp_configured(),
                    "dev_otp_allowed": settings.allow_dev_otp,
                },
                indent=2,
            )
        )
        return 0

    code = print_config_report()
    if code != 0:
        return code
    if args.send_test:
        return asyncio.run(send_test_otp(args.send_test))
    if args.send_signup_test:
        return asyncio.run(send_test_otp(args.send_signup_test, signup=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
