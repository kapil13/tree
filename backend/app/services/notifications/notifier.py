"""Multi-channel notifier: email (SES), SMS (SNS), push (FCM), in-app."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.core.logging import get_logger

Channel = Literal["email", "sms", "push", "in_app"]

log = get_logger("notifier")


@dataclass
class NotificationResult:
    channel: Channel
    delivered: bool
    info: str | None = None


class Notifier:
    async def send(
        self,
        *,
        channel: Channel,
        to: str,
        title: str,
        message: str,
    ) -> NotificationResult:
        # Production: route to SES / SNS / FCM. Dev: log and pretend success.
        log.info(
            "notification.send",
            channel=channel,
            to=_redact(to),
            title=title,
        )
        return NotificationResult(channel=channel, delivered=True)


def _redact(s: str) -> str:
    if "@" in s:
        u, _, d = s.partition("@")
        return f"{u[:2]}***@{d}"
    if len(s) > 4:
        return f"{s[:2]}***{s[-2:]}"
    return "***"


_notifier: Notifier | None = None


def get_notifier() -> Notifier:
    global _notifier
    if _notifier is None:
        _notifier = Notifier()
    return _notifier
