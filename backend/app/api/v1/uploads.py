"""Media uploads — browser sends files to the API; the API writes MinIO/S3."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.v1.deps import DB, WriteAccess
from app.schemas.bioacoustic import PresignUploadRequest, PresignUploadResponse
from app.services.platform.governance import assert_org_feature_enabled
from app.services.storage import get_storage
from app.services.storage.images import ImageUploadError, persist_image_bytes

router = APIRouter(prefix="/uploads", tags=["uploads"])

_ALLOWED_AUDIO = {
    "audio/m4a",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/ogg",
}


class ImageUploadResponse(BaseModel):
    s3_key: str
    content_type: str


@router.post("/image", response_model=ImageUploadResponse)
async def upload_image(
    user: WriteAccess,
    file: UploadFile = File(...),
) -> ImageUploadResponse:
    """Store a tree/pit photo on MinIO via the API (browser never talks to MinIO)."""
    filename = file.filename or "photo.jpg"
    data = await file.read()
    try:
        key, content_type = persist_image_bytes(
            get_storage(),
            user_id=user.id,
            filename=filename,
            content_type=file.content_type,
            data=data,
        )
    except ImageUploadError as exc:
        status_code = (
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            if exc.code == "image_too_large"
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code, detail=exc.code) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="storage_upload_failed",
        ) from exc
    return ImageUploadResponse(s3_key=key, content_type=content_type)


@router.post("/presign", response_model=PresignUploadResponse)
async def presign_upload(payload: PresignUploadRequest, user: WriteAccess, db: DB) -> PresignUploadResponse:
    ct = payload.content_type.lower().strip()
    if ct not in _ALLOWED_AUDIO and not ct.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="unsupported_content_type")

    if ct.startswith("audio/"):
        await assert_org_feature_enabled(db, user, "bioacoustic")

    ext = payload.filename.rsplit(".", 1)[-1].lower() if "." in payload.filename else "bin"
    folder = "bioacoustic" if ct.startswith("audio/") else "images"
    key = f"{folder}/{user.id}/{uuid.uuid4()}.{ext}"

    storage = get_storage()
    expires = 900
    url = storage.presigned_put(key, content_type=ct, expires_in=expires)
    return PresignUploadResponse(
        upload_url=url,
        s3_key=key,
        content_type=ct,
        expires_in=expires,
    )
