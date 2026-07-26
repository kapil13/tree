"""Boot-time and runtime guards for staging/production safety."""

from __future__ import annotations

from app.core.config import settings

_WEAK_JWT_SECRETS = frozenset(
    {
        "",
        "change-me",
        "change-me-in-prod-please",
        "secret",
        "jwt-secret",
        "byot",
    }
)


def is_hardened_env() -> bool:
    return settings.app_env in {"production", "staging"}


def validate_runtime_settings() -> None:
    """Refuse unsafe production/staging configuration at process start."""
    if not is_hardened_env():
        return

    secret = (settings.jwt_secret or "").strip()
    if (
        secret in _WEAK_JWT_SECRETS
        or secret.upper().startswith("CHANGE_ME")
        or len(secret) < 32
    ):
        raise RuntimeError(
            "Unsafe JWT_SECRET for production/staging. "
            "Set JWT_SECRET to a random value of at least 32 characters "
            "(e.g. openssl rand -hex 32)."
        )

    if settings.app_env == "production" and settings.app_debug:
        raise RuntimeError("APP_DEBUG must be false when APP_ENV=production.")

    if settings.auth_allow_dev_otp is True:
        raise RuntimeError(
            "AUTH_ALLOW_DEV_OTP cannot be true in production/staging. "
            "Remove it or set AUTH_ALLOW_DEV_OTP=false."
        )

    site_key = (settings.turnstile_site_key or "").strip()
    secret_key = (settings.turnstile_secret_key or "").strip()
    if not site_key or not secret_key:
        raise RuntimeError(
            "Cloudflare Turnstile CAPTCHA is required in production/staging. "
            "Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY."
        )

    razorpay_configured = bool(
        (settings.razorpay_key_id or "").strip()
        and (settings.razorpay_key_secret or "").strip()
    )
    if razorpay_configured and not (settings.razorpay_webhook_secret or "").strip():
        raise RuntimeError(
            "RAZORPAY_WEBHOOK_SECRET is required when Razorpay payments are "
            "configured in production/staging. Do not reuse RAZORPAY_KEY_SECRET."
        )
