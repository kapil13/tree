"""Direct upload presign for media (audio, images)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.v1.deps import CurrentUser
from app.schemas.bioacoustic import PresignUploadRequest, PresignUploadResponse
from app.services.storage import get_storage

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


@router.post("/presign", response_model=PresignUploadResponse)
async def presign_upload(payload: PresignUploadRequest, user: CurrentUser) -> PresignUploadResponse:
    ct = payload.content_type.lower().strip()
    if ct not in _ALLOWED_AUDIO and not ct.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="unsupported_content_type")

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
