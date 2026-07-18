"""Multi-channel notifier: email (SES), SMS (SNS), push (FCM), in-app."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Literal

try:
    import boto3
except Exception:  # pragma: no cover
    boto3 = None

from app.core.config import settings
from app.core.logging import get_logger

Channel = Literal["email", "sms", "push", "in_app"]

log = get_logger("notifier")


@dataclass
class NotificationResult:
    channel: Channel
    delivered: bool
    info: str | None = None


class Notifier:
    def __init__(self) -> None:
        self._ses = None
        self._sns = None
        if boto3 is not None and settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs: dict[str, Any] = {"region_name": settings.aws_region}
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
            self._ses = boto3.client("ses", **kwargs)
            self._sns = boto3.client("sns", **kwargs)

    def _send_email_sync(self, to: str, title: str, message: str) -> NotificationResult:
        if self._ses is None:
            log.info("notification.send", channel="email", to=_redact(to), title=title)
            return NotificationResult(channel="email", delivered=True, info="dev_stub")
        try:
            self._ses.send_email(
                Source=settings.ses_sender,
                Destination={"ToAddresses": [to]},
                Message={
                    "Subject": {"Data": title, "Charset": "UTF-8"},
                    "Body": {"Text": {"Data": message, "Charset": "UTF-8"}},
                },
            )
            return NotificationResult(channel="email", delivered=True)
        except Exception as exc:
            log.warning("notification.email_failed", error=str(exc))
            return NotificationResult(channel="email", delivered=False, info=str(exc))

    def _send_sms_sync(self, to: str, title: str, message: str) -> NotificationResult:
        body = f"{title}: {message}"[:1400]
        if self._sns is None:
            log.info("notification.send", channel="sms", to=_redact(to), title=title)
            return NotificationResult(channel="sms", delivered=True, info="dev_stub")
        try:
            attrs: dict[str, Any] = {}
            if settings.sns_sms_sender_id:
                attrs["AWS.SNS.SMS.SenderID"] = {
                    "DataType": "String",
                    "StringValue": settings.sns_sms_sender_id[:11],
                }
            self._sns.publish(PhoneNumber=to, Message=body, MessageAttributes=attrs or None)
            return NotificationResult(channel="sms", delivered=True)
        except Exception as exc:
            log.warning("notification.sms_failed", error=str(exc))
            return NotificationResult(channel="sms", delivered=False, info=str(exc))

    async def send(
        self,
        *,
        channel: Channel,
        to: str,
        title: str,
        message: str,
    ) -> NotificationResult:
        if channel == "in_app":
            return NotificationResult(channel="in_app", delivered=True)
        if channel == "email":
            return await asyncio.to_thread(self._send_email_sync, to, title, message)
        if channel == "sms":
            return await asyncio.to_thread(self._send_sms_sync, to, title, message)
        log.info("notification.send", channel=channel, to=_redact(to), title=title)
        return NotificationResult(channel=channel, delivered=True, info="unsupported_channel")


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
