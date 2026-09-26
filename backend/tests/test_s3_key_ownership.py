"""Unit tests for S3 upload key ownership checks."""

from __future__ import annotations

import uuid

import pytest

from app.services.storage.key_ownership import assert_owned_upload_key


def test_owned_key_accepted():
    uid = uuid.uuid4()
    assert_owned_upload_key(uid, f"images/{uid}/photo.jpg")
    assert_owned_upload_key(uid, f"bioacoustic/{uid}/rec.webm", folders=("bioacoustic",))


@pytest.mark.parametrize(
    "key",
    [
        "",
        "../etc/passwd",
        "images/../secret",
        "/images/x/y",
        "images\\user\\file",
    ],
)
def test_invalid_keys_rejected(key: str):
    uid = uuid.uuid4()
    with pytest.raises(ValueError, match="invalid_s3_key"):
        assert_owned_upload_key(uid, key)


def test_other_user_key_forbidden():
    uid = uuid.uuid4()
    other = uuid.uuid4()
    with pytest.raises(ValueError, match="s3_key_forbidden"):
        assert_owned_upload_key(uid, f"images/{other}/photo.jpg")


def test_wrong_folder_forbidden():
    uid = uuid.uuid4()
    with pytest.raises(ValueError, match="s3_key_forbidden"):
        assert_owned_upload_key(uid, f"images/{uid}/x.jpg", folders=("bioacoustic",))


def test_prefix_only_forbidden():
    uid = uuid.uuid4()
    with pytest.raises(ValueError, match="s3_key_forbidden"):
        assert_owned_upload_key(uid, f"images/{uid}/")
