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
    duration_seconds: float = Field(..., ge=60, le=180)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    plantation_fence_id: uuid.UUID | None = None
    recorded_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SpeciesDetectionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

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
    gbif_usage_key: int | None = None
    gbif_match_type: str | None = None
    regional_occurrence_match: bool | None = None
    needs_review: bool | None = None
    is_native: bool | None = None
    time_intervals: list[dict[str, float]] | None = None
    metadata_sources: dict[str, Any] | None = None
    pipeline_source: str | None = None


class RegionalFaunaSpecies(BaseModel):
    scientific_name: str
    common_name: str
    taxon_group: str
    gbif_usage_key: int
    occurrence_count: int
    iucn_status: str
    population_trend: str
    threat_status: str
    iucn_taxon_id: str | None = None
    iucn_url: str | None = None
    metadata_sources: dict[str, str] = Field(default_factory=dict)


class RegionalFaunaOut(BaseModel):
    latitude: float
    longitude: float
    radius_km: float
    provider: str
    species_count: int
    taxon_breakdown: dict[str, int] = Field(default_factory=dict)
    species: list[RegionalFaunaSpecies] = Field(default_factory=list)
    iucn_live: bool = False


class BioacousticAnalyzeResponse(BaseModel):
    recording_id: uuid.UUID
    status: str
    celery_task_id: str | None = None


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
    simpson_diversity_index: float | None = None
    bioacoustic_health_score: float | None = None
    ai_confidence_score: float | None = None
    analysis_summary: str | None = None
    analysis_error: str | None = None
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
            simpson_diversity_index=float(rec.simpson_diversity_index)
            if rec.simpson_diversity_index is not None
            else None,
            bioacoustic_health_score=float(rec.bioacoustic_health_score)
            if rec.bioacoustic_health_score is not None
            else None,
            ai_confidence_score=float(rec.ai_confidence_score)
            if rec.ai_confidence_score is not None
            else None,
            analysis_summary=rec.analysis_summary,
            analysis_error=rec.analysis_error,
            analyzed_at=rec.analyzed_at,
            created_at=rec.created_at,
        )


class BioacousticSummary(BaseModel):
    total_recordings: int
    analyzed_recordings: int
    avg_health_score: float
    avg_shannon_index: float
    avg_simpson_index: float
    total_species_detected: int
    threatened_species_count: int
    taxon_breakdown: dict[str, int] = Field(default_factory=dict)
    recent_recordings: list[BioacousticRecordingOut] = Field(default_factory=list)


class FenceBiodiversityOut(BaseModel):
    fence_id: uuid.UUID
    fence_name: str
    recording_count: int
    avg_health_score: float
    avg_shannon_index: float
    avg_simpson_index: float
    total_species_detected: int
    threatened_species_count: int
    taxon_breakdown: dict[str, int] = Field(default_factory=dict)
    species_list: list[dict[str, Any]] = Field(default_factory=list)


class EcosystemHealthOut(BaseModel):
    fence_id: uuid.UUID
    fence_name: str
    area_ha: float | None = None
    bioacoustic: FenceBiodiversityOut
    ndvi_mean: float | None = None
    ndvi_trend: str | None = None
    ndvi_series: list[dict[str, Any]] = Field(default_factory=list)
    satellite_health: dict[str, Any] = Field(default_factory=dict)
    correlation_score: float | None = None
    ecosystem_health_score: float = 0.0
    interpretation: str = ""
