"""Request validation error envelope — must not 500 on pydantic failures."""

from __future__ import annotations

import json

import pytest
from fastapi import Request
from fastapi.exceptions import RequestValidationError

from app.main import validation_exc


@pytest.mark.asyncio
async def test_validation_error_returns_422_not_500():
    request = Request({"type": "http", "method": "POST", "path": "/api/v1/trees"})
    exc = RequestValidationError(
        errors=[
            {
                "type": "float_parsing",
                "loc": ("body", "latitude"),
                "msg": "Input should be a valid number",
                "input": "not-a-number",
            }
        ]
    )
    response = await validation_exc(request, exc)
    assert response.status_code == 422
    body = json.loads(response.body)
    assert body["error"]["code"] == "validation_error"
    assert isinstance(body["error"]["details"]["errors"], list)
