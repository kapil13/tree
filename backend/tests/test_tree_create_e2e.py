"""End-to-end tree registration — mobile-shaped payload with ISO planted_at."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch

from app.main import app


class _StubStorage:
    def is_available(self) -> bool:
        return True

    def put_bytes(self, key: str, data: bytes, *, content_type: str = "application/octet-stream") -> str:
        return f"stub://{key}"

    def get_bytes(self, key: str) -> bytes:
        return (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c"
            b"\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c"
            b"\x1c $.\' \",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00"
            b"\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01"
            b"\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07"
            b"\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05"
            b"\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"
            b'"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18'
            b"\x19\x1a%&'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87"
            b"\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7"
            b"\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7"
            b"\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6"
            b"\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08"
            b"\x01\x01\x00\x00?\x00\xfb\xd5\x00\xff\xd9"
        )

    def presigned_get(self, key: str, *, expires_in: int = 900) -> str:
        return f"https://stub/{key}"


@pytest.mark.asyncio
async def test_create_tree_with_mobile_iso_planted_at_and_photo():
    stub = _StubStorage()
    patches = [
        patch("app.services.storage.get_storage", return_value=stub),
        patch("app.services.storage.s3.get_storage", return_value=stub),
        patch("app.api.v1.uploads.get_storage", return_value=stub),
        patch("app.api.v1.trees.get_storage", return_value=stub),
        patch("app.services.integrity.image_loader.get_storage", return_value=stub),
    ]
    for p in patches:
        p.start()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            login = await client.post(
                "/api/v1/auth/login",
                json={"email": "demo@byot.earth", "password": "byotdemo1234!"},
            )
            assert login.status_code == 200
            token = login.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            upload = await client.post(
                "/api/v1/uploads/image",
                headers=headers,
                files={"file": ("tree.jpg", stub.get_bytes("x"), "image/jpeg")},
            )
            assert upload.status_code == 200
            key = upload.json()["s3_key"]
            res = await client.post(
                "/api/v1/trees",
                headers=headers,
                json={
                    "program_code": "byot",
                    "species_text": "Neem",
                    "latitude": 26.87585,
                    "longitude": 75.74413,
                    "accuracy_m": 17,
                    "planted_at": "2026-09-04T14:59:00.000Z",
                    "photo_keys": [key],
                    "metadata": {},
                    "initial_measurement": {"method": "visual_estimate"},
                },
            )
    finally:
        for p in patches:
            p.stop()

    assert res.status_code == 201
    body = res.json()
    assert body["species_text"] == "Neem"
    assert body["planted_at"] == "2026-09-04"
    assert len(body["images"]) == 1
