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
