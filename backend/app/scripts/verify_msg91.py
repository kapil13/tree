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
    msg91_public_config,
    send_auth_otp_sms,
    sms_auth_configured,
)


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
            "MSG91_OTP_TEMPLATE_ID",
            bool(settings.msg91_otp_template_id),
            settings.msg91_otp_template_id or "empty (recommended for India DLT)",
        ),
        _status_line(
            "MSG91_SENDER_ID",
            bool(settings.msg91_sender_id),
            settings.msg91_sender_id or "empty",
        ),
        _status_line("sms_configured (ready to send)", msg91["sms_configured"]),
        _status_line("sms_template_configured", msg91["sms_template_configured"]),
        _status_line(
            "AUTH_OTP_EMAIL_ENABLED",
            settings.auth_otp_email_enabled,
        ),
        _status_line(
            "GMAIL_SENDER + service account",
            bool(settings.gmail_sender and settings.google_service_account_json),
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
            "\nWARN: MSG91_OTP_TEMPLATE_ID is empty — India DLT may reject OTP sends without a template.",
            file=sys.stderr,
        )
    return 0


async def send_test_otp(phone: str) -> int:
    if not sms_auth_configured():
        print("ERROR: SMS not configured — run config report first.", file=sys.stderr)
        return 1
    code = os.environ.get("MSG91_VERIFY_OTP", "123456")
    print(f"Sending test OTP to {phone} (code={code})...")
    try:
        sent = await send_auth_otp_sms(phone=phone, code=code)
    except SmsSendError as exc:
        print(f"ERROR: MSG91 send failed: {exc.code}", file=sys.stderr)
        return 1
    if sent:
        print("OK: MSG91 accepted the OTP request (check phone and backend logs for msg91.otp_sent).")
        return 0
    print("WARN: send_auth_otp_sms returned False (stub mode).", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify MSG91 OTP wiring")
    parser.add_argument(
        "--send-test",
        metavar="PHONE",
        help="Send a test OTP to this phone (e.g. 9876543210 or +919876543210)",
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
                    "email_configured": bool(
                        settings.auth_otp_email_enabled
                        and settings.gmail_sender
                        and settings.google_service_account_json
                    ),
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
