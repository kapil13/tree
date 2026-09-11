"""Audit-mode satellite provider guards — reject stub data."""

from __future__ import annotations

STUB_PROVIDERS = frozenset(
    {
        "sentinel-2-stub",
        "byot-satellite-stub-1.0.0",
        "nisar-sar-stub",
        "stub",
    }
)


def is_stub_provider(provider: str | None) -> bool:
    if not provider:
        return True
    lower = provider.lower()
    return lower in STUB_PROVIDERS or "stub" in lower


def assert_audit_provider(provider: str) -> None:
    if is_stub_provider(provider):
        raise ValueError("stub_not_allowed_in_audit_mode")
