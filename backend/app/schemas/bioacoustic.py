from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PresignUploadRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(default="audio/m4a", max_length=128)


class PresignUploadResponse(BaseModel):
    upload_url: str
    s3_key: str
    content_type: str
    expires_in: int


class BioacousticRecordingCreate(BaseModel):
    s3_key: str = Field(..., min_length=1, max_length=512)
    duration_seconds: float = Field(..., ge=5, le=120)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    plantation_fence_id: uuid.UUID | None = None
    recorded_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SpeciesDetectionOut(BaseModel):
    scientific_name: str
    common_name: str
    taxon_group: str
    confidence: float
    call_count: int
    iucn_status: str
    population_trend: str
    threat_status: str
    iucn_taxon_id: str | None = None
    iucn_url: str | None = None


class BioacousticRecordingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    s3_key: str
    duration_seconds: float
    recorded_at: datetime
    latitude: float | None = None
    longitude: float | None = None
    plantation_fence_id: uuid.UUID | None = None
    status: str
    spectrogram_s3_key: str | None = None
    preprocessing: dict[str, Any] = Field(default_factory=dict)
    species_detections: list[SpeciesDetectionOut] = Field(default_factory=list)
    total_species_count: int | None = None
    total_calls_detected: int | None = None
    shannon_diversity_index: float | None = None
    bioacoustic_health_score: float | None = None
    ai_confidence_score: float | None = None
    analysis_summary: str | None = None
    analyzed_at: datetime | None = None
    created_at: datetime

    @classmethod
    def from_model(cls, rec) -> "BioacousticRecordingOut":
        lat = lon = None
        if rec.location is not None:
            from geoalchemy2.shape import to_shape

            pt = to_shape(rec.location)
            lon, lat = float(pt.x), float(pt.y)
        detections = [
            SpeciesDetectionOut(**d) if isinstance(d, dict) else d
            for d in (rec.species_detections or [])
        ]
        return cls(
            id=rec.id,
            s3_key=rec.s3_key,
            duration_seconds=float(rec.duration_seconds),
            recorded_at=rec.recorded_at,
            latitude=lat,
            longitude=lon,
            plantation_fence_id=rec.plantation_fence_id,
            status=rec.status,
            spectrogram_s3_key=rec.spectrogram_s3_key,
            preprocessing=rec.preprocessing or {},
            species_detections=detections,
            total_species_count=rec.total_species_count,
            total_calls_detected=rec.total_calls_detected,
            shannon_diversity_index=float(rec.shannon_diversity_index)
            if rec.shannon_diversity_index is not None
            else None,
            bioacoustic_health_score=float(rec.bioacoustic_health_score)
            if rec.bioacoustic_health_score is not None
            else None,
            ai_confidence_score=float(rec.ai_confidence_score)
            if rec.ai_confidence_score is not None
            else None,
            analysis_summary=rec.analysis_summary,
            analyzed_at=rec.analyzed_at,
            created_at=rec.created_at,
        )


class BioacousticSummary(BaseModel):
    total_recordings: int
    analyzed_recordings: int
    avg_health_score: float
    avg_shannon_index: float
    total_species_detected: int
    threatened_species_count: int
    recent_recordings: list[BioacousticRecordingOut] = Field(default_factory=list)
