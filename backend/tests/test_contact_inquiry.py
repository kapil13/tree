"""Tests for public contact inquiry endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import rate_limit
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def disable_rate_limit_redis():
    rate_limit._redis = None
    with patch("app.core.rate_limit._client", AsyncMock(return_value=None)):
        yield
    rate_limit._redis = None

VALID_PAYLOAD = {
    "full_name": "Kapil Sharma",
    "email": "kapil@example.com",
    "phone": "+91 9876543210",
    "organization": "Green Estates Pvt Ltd",
    "organization_type": "corporate_esg",
    "state": "Maharashtra",
    "land_hectares_band": "1000_10000",
    "site_count_band": "11_50",
    "message": "We manage 25 plantation sites and need satellite MRV plus audit-ready exports.",
}


def test_contact_inquiry_success():
    with patch(
        "app.api.v1.contact.send_contact_inquiry_email",
        new=AsyncMock(return_value=None),
    ) as mock_send:
        response = client.post("/api/v1/contact", json=VALID_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    mock_send.assert_called_once()


def test_contact_inquiry_rejects_honeypot():
    from pydantic import ValidationError

    from app.schemas.contact import ContactInquiryCreate

    with pytest.raises(ValidationError):
        ContactInquiryCreate(**{**VALID_PAYLOAD, "website": "https://spam.example"})


def test_contact_inquiry_requires_message_length():
    from pydantic import ValidationError

    from app.schemas.contact import ContactInquiryCreate

    with pytest.raises(ValidationError):
        ContactInquiryCreate(**{**VALID_PAYLOAD, "message": "Too short"})


@pytest.mark.asyncio
async def test_send_contact_inquiry_email_dev_fallback():
    from app.schemas.contact import ContactInquiryCreate
    from app.services.contact.email import send_contact_inquiry_email

    payload = ContactInquiryCreate(**VALID_PAYLOAD)
    with patch(
        "app.services.contact.email._send_email_sync",
        side_effect=RuntimeError("SES unavailable"),
    ):
        await send_contact_inquiry_email(payload)
