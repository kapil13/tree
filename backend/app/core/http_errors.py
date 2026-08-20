"""Format HTTPException details into API error responses."""

from __future__ import annotations

from typing import Any


def format_http_exception_detail(detail: Any) -> tuple[str, str, dict[str, Any] | None]:
    """Return (code, message, details) for ErrorResponse."""
    if isinstance(detail, str):
        return detail, detail.replace("_", " ").capitalize(), None

    if isinstance(detail, dict):
        compliance = detail.get("compliance_errors")
        if isinstance(compliance, list) and compliance:
            messages: list[str] = []
            for item in compliance:
                if isinstance(item, dict):
                    msg = item.get("message")
                    if isinstance(msg, str) and msg.strip():
                        messages.append(msg.strip())
                elif isinstance(item, str) and item.strip():
                    messages.append(item.strip())
            message = "; ".join(messages) if messages else "Compliance check failed"
            return "compliance_failed", message, detail

        validation = detail.get("validation_errors")
        if isinstance(validation, list) and validation:
            message = "; ".join(str(item) for item in validation if str(item).strip())
            if not message:
                message = "Validation failed"
            return "validation_failed", message, detail

        code = str(detail.get("code", "http_error"))
        message = str(detail.get("message", "Error"))
        extras = {k: v for k, v in detail.items() if k not in {"code", "message"}}
        return code, message, extras or None

    return "http_error", "Error", None
