"""Amazon SES auth email readiness check — run inside backend container or locally."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from app.core.config import settings
from app.services.auth.ses_email_sender import (
    EmailSendError,
    send_auth_otp_email,
    ses_otp_configured,
    ses_public_config,
)


def _status_line(label: str, ok: bool, detail: str = "") -> str:
    mark = "OK" if ok else "MISSING"
    suffix = f" ({detail})" if detail else ""
    return f"  [{mark}] {label}{suffix}"


def print_config_report() -> int:
    ses = ses_public_config()
    lines = [
        "Amazon SES / auth email OTP configuration",
        _status_line(
            "AUTH_OTP_EMAIL_ENABLED",
            settings.auth_otp_email_enabled,
            str(settings.auth_otp_email_enabled),
        ),
        _status_line(
            "SES_SENDER",
            bool(settings.ses_sender),
            settings.ses_sender or "empty",
        ),
        _status_line(
            "AWS credentials",
            bool(settings.aws_access_key_id and settings.aws_secret_access_key),
            settings.aws_region,
        ),
        _status_line("email_configured (ready to send)", ses["email_configured"]),
        _status_line("dev_otp_allowed", settings.allow_dev_otp),
    ]
    print("\n".join(lines))
    if not ses["email_configured"] and not settings.allow_dev_otp:
        print(
            "\nERROR: Email OTP will fail until AUTH_OTP_EMAIL_ENABLED=true, "
            "SES_SENDER is verified in AWS SES, and AWS credentials are set.",
            file=sys.stderr,
        )
        return 1
    return 0


async def send_test_email(to: str) -> int:
    if not ses_otp_configured():
        print("ERROR: SES not configured — run config report first.", file=sys.stderr)
        return 1
    code = os.environ.get("SES_VERIFY_OTP", "123456")
    print(f"Sending test OTP email to {to} (code={code})...")
    try:
        await send_auth_otp_email(to=to.strip().lower(), code=code)
    except EmailSendError as exc:
        print(f"ERROR: SES send failed: {exc.code}", file=sys.stderr)
        return 1
    print("OK: SES accepted the send (check inbox and backend logs for ses.auth_otp_sent).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify Amazon SES auth email wiring")
    parser.add_argument(
        "--send-test",
        metavar="EMAIL",
        help="Send a test OTP email to this address",
    )
    parser.add_argument("--json", action="store_true", help="Print otp-config JSON only")
    args = parser.parse_args()

    if args.json:
        ses = ses_public_config()
        print(
            json.dumps(
                {
                    **ses,
                    "email_enabled": settings.auth_otp_email_enabled,
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
        return asyncio.run(send_test_email(args.send_test))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
