"""Verify Resend transactional email configuration and optionally send a test OTP."""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from app.core.config import settings
from app.services.email import email_otp_configured, email_public_config, send_login_otp
from app.services.email.exceptions import EmailSendError


def _status_line(label: str, value: object) -> str:
    return f"  {label}: {value}"


def print_config() -> int:
    print("Resend email configuration")
    print(_status_line("AUTH_OTP_EMAIL_ENABLED", settings.auth_otp_email_enabled))
    print(_status_line("RESEND_FROM_EMAIL", settings.resend_from_email or "empty"))
    print(
        _status_line(
            "RESEND_API_KEY",
            "set" if (settings.resend_api_key or "").strip() else "missing",
        )
    )
    print(_status_line("RESEND_FROM_NAME", settings.resend_from_name))

    config = email_public_config()
    print(_status_line("email_configured (ready to send)", config["email_configured"]))

    if not config["email_configured"] and not settings.allow_dev_otp:
        print(
            "\nERROR: Email OTP is not configured. Set AUTH_OTP_EMAIL_ENABLED=true, "
            "RESEND_API_KEY, and RESEND_FROM_EMAIL (verified domain in Resend).",
            file=sys.stderr,
        )
        return 1
    return 0


async def send_test_email(to: str) -> int:
    if not email_otp_configured():
        print("ERROR: Resend email OTP is not configured.", file=sys.stderr)
        return 1

    code = os.environ.get("RESEND_VERIFY_OTP", "123456")
    print(f"Sending test login OTP to {to} ...")
    try:
        await send_login_otp(to=to.strip().lower(), code=code)
    except EmailSendError as exc:
        print(f"ERROR: send failed ({exc.code})", file=sys.stderr)
        return 1

    print("OK: test email sent. Check inbox and the Resend dashboard.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify Resend email configuration")
    parser.add_argument(
        "--send-test",
        metavar="EMAIL",
        help="Send a test login OTP email to this address",
    )
    args = parser.parse_args()

    code = print_config()
    if code != 0:
        return code
    if args.send_test:
        return asyncio.run(send_test_email(args.send_test))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
