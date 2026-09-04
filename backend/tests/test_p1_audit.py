"""P1 audit regressions — feature gating and compliance catalog."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.compliance import get_checklist_catalog
from app.api.v1.payments import list_my_orders, verify_payment
from app.schemas.payments import PaymentVerifyIn


@pytest.mark.asyncio
async def test_payments_verify_checks_feature_flag():
    user = MagicMock(id=uuid.uuid4(), role="user", organization_id=uuid.uuid4())
    db = AsyncMock()
    request = MagicMock()
    payload = PaymentVerifyIn(
        razorpay_order_id="order_1",
        razorpay_payment_id="pay_1",
        razorpay_signature="sig",
    )

    with (
        patch("app.api.v1.payments.payments_enabled", return_value=True),
        patch(
            "app.api.v1.payments.assert_org_feature_enabled",
            new_callable=AsyncMock,
            side_effect=HTTPException(403, detail="org_feature_disabled:payments"),
        ) as mock_flag,
        pytest.raises(HTTPException) as exc,
    ):
        await verify_payment(payload, request, user, db)
    mock_flag.assert_awaited_once_with(db, user, "payments")
    assert exc.value.detail == "org_feature_disabled:payments"


@pytest.mark.asyncio
async def test_payments_list_orders_checks_feature_flag():
    user = MagicMock(id=uuid.uuid4(), role="user", organization_id=uuid.uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
    )

    with (
        patch(
            "app.api.v1.payments.assert_org_feature_enabled",
            new_callable=AsyncMock,
            side_effect=HTTPException(403, detail="org_feature_disabled:payments"),
        ),
        pytest.raises(HTTPException) as exc,
    ):
        await list_my_orders(user, db)
    assert exc.value.detail == "org_feature_disabled:payments"


@pytest.mark.asyncio
async def test_compliance_catalog_uses_effective_checklists():
    user = MagicMock()
    db = AsyncMock()
    catalog = [{"code": "esg_general", "title": "ESG", "has_custom_items": True}]
    with patch(
        "app.api.v1.compliance.list_effective_checklist_catalog",
        new_callable=AsyncMock,
        return_value=catalog,
    ) as mock_catalog:
        result = await get_checklist_catalog(user, db)
    mock_catalog.assert_awaited_once_with(db)
    assert result == catalog


@pytest.mark.asyncio
async def test_bhoonidhi_router_requires_satellite_feature():
    from app.api.v1.bhoonidhi import _require_bhoonidhi_access

    org_id = uuid.uuid4()
    user = MagicMock(role="user", organization_id=org_id)
    org = MagicMock(metadata_={"feature_flags": {"satellite": False}})
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    with pytest.raises(HTTPException) as exc:
        await _require_bhoonidhi_access(user, db)
    assert exc.value.detail == "org_feature_disabled:satellite"


@pytest.mark.asyncio
async def test_emissions_access_requires_satellite_feature():
    from app.api.v1.emissions import _require_emissions_access

    org_id = uuid.uuid4()
    user = MagicMock(role="user", organization_id=org_id)
    org = MagicMock(metadata_={"feature_flags": {"satellite": False}})
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    with pytest.raises(HTTPException) as exc:
        await _require_emissions_access(user, db)
    assert exc.value.detail == "org_feature_disabled:satellite"
