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
    recording_started_at: datetime | None = None
    recording_ended_at: datetime | None = None
    gps_accuracy_m: float | None = Field(None, ge=0, le=5000)
    gps_source: str | None = Field(None, max_length=32)
    gps_verified: bool | None = None
    gps_fallback: bool | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SpeciesDetectionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    scientific_name: str
    common_name: str
    taxon_group: str
    confidence: float
    call_count: int
    detection_tier: str | None = None
    iucn_status: str
    population_trend: str
    threat_status: str
    iucn_taxon_id: str | None = None
    iucn_url: str | None = None
    gbif_usage_key: int | None = None
    gbif_match_type: str | None = None
    regional_occurrence_match: bool | None = None
    regionally_plausible: bool | None = None
    needs_review: bool | None = None
    included_in_richness: bool | None = None
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


class BioacousticAnalysisRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recording_id: uuid.UUID
    run_number: int
    supersedes_run_id: uuid.UUID | None = None
    status: str
    pipeline: str | None = None
    model_version: str | None = None
    config_hash: str | None = None
    audio_sha256: str | None = None
    methodology_version: str | None = None
    accepted_species_count: int | None = None
    acoustic_signals_count: int | None = None
    biodiversity_confidence_score: float | None = None
    shannon_diversity_index: float | None = None
    simpson_diversity_index: float | None = None
    analyzed_at: datetime | None = None
    created_at: datetime


class BioacousticRecordingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    s3_key: str
    duration_seconds: float
    recorded_at: datetime
    recording_started_at: datetime | None = None
    recording_ended_at: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
    gps_accuracy_m: float | None = None
    gps_source: str | None = None
    gps_verified: bool = False
    gps_fallback: bool = False
    plantation_fence_id: uuid.UUID | None = None
    status: str
    spectrogram_s3_key: str | None = None
    preprocessing: dict[str, Any] = Field(default_factory=dict)
    species_detections: list[SpeciesDetectionOut] = Field(default_factory=list)
    accepted_species_count: int | None = None
    acoustic_signals_count: int | None = None
    total_species_count: int | None = None
    total_calls_detected: int | None = None
    shannon_diversity_index: float | None = None
    simpson_diversity_index: float | None = None
    biodiversity_confidence_score: float | None = None
    bioacoustic_health_score: float | None = None
    ai_confidence_score: float | None = None
    latest_analysis_run_id: uuid.UUID | None = None
    methodology_version: str | None = None
    analysis_summary: str | None = None
    analysis_error: str | None = None
    analyzed_at: datetime | None = None
    created_at: datetime
    scientific_limitations: list[str] = Field(default_factory=list)

    @classmethod
    def from_model(cls, rec) -> BioacousticRecordingOut:
        from app.services.bioacoustic.confidence import METHODOLOGY_VERSION
        from app.services.bioacoustic.methodology import SCIENTIFIC_LIMITATIONS

        lat = lon = None
        if rec.location is not None:
            from geoalchemy2.shape import to_shape

            pt = to_shape(rec.location)
            lon, lat = float(pt.x), float(pt.y)
        detections = [
            SpeciesDetectionOut(**d) if isinstance(d, dict) else d
            for d in (rec.species_detections or [])
        ]
        preprocessing = rec.preprocessing or {}
        methodology_version = preprocessing.get("methodology_version") or METHODOLOGY_VERSION
        confidence = (
            float(rec.biodiversity_confidence_score)
            if rec.biodiversity_confidence_score is not None
            else (
                float(rec.bioacoustic_health_score)
                if rec.bioacoustic_health_score is not None
                else None
            )
        )
        return cls(
            id=rec.id,
            s3_key=rec.s3_key,
            duration_seconds=float(rec.duration_seconds),
            recorded_at=rec.recorded_at,
            recording_started_at=rec.recording_started_at,
            recording_ended_at=rec.recording_ended_at,
            latitude=lat,
            longitude=lon,
            gps_accuracy_m=float(rec.gps_accuracy_m) if rec.gps_accuracy_m is not None else None,
            gps_source=rec.gps_source,
            gps_verified=bool(rec.gps_verified),
            gps_fallback=bool(rec.gps_fallback),
            plantation_fence_id=rec.plantation_fence_id,
            status=rec.status,
            spectrogram_s3_key=rec.spectrogram_s3_key,
            preprocessing=preprocessing,
            species_detections=detections,
            accepted_species_count=rec.accepted_species_count,
            acoustic_signals_count=rec.acoustic_signals_count,
            total_species_count=rec.accepted_species_count or rec.total_species_count,
            total_calls_detected=rec.total_calls_detected,
            shannon_diversity_index=float(rec.shannon_diversity_index)
            if rec.shannon_diversity_index is not None
            else None,
            simpson_diversity_index=float(rec.simpson_diversity_index)
            if rec.simpson_diversity_index is not None
            else None,
            biodiversity_confidence_score=confidence,
            bioacoustic_health_score=confidence,
            ai_confidence_score=float(rec.ai_confidence_score)
            if rec.ai_confidence_score is not None
            else None,
            latest_analysis_run_id=rec.latest_analysis_run_id,
            methodology_version=methodology_version,
            analysis_summary=rec.analysis_summary,
            analysis_error=rec.analysis_error,
            analyzed_at=rec.analyzed_at,
            created_at=rec.created_at,
            scientific_limitations=list(SCIENTIFIC_LIMITATIONS),
        )


class BioacousticSummary(BaseModel):
    total_recordings: int
    analyzed_recordings: int
    avg_confidence_score: float
    avg_health_score: float
    avg_shannon_index: float
    avg_simpson_index: float
    total_accepted_species: int
    total_species_detected: int
    threatened_species_count: int
    taxon_breakdown: dict[str, int] = Field(default_factory=dict)
    recent_recordings: list[BioacousticRecordingOut] = Field(default_factory=list)
    methodology_version: str
    scientific_limitations: list[str] = Field(default_factory=list)


class FenceBiodiversityOut(BaseModel):
    fence_id: uuid.UUID
    fence_name: str
    recording_count: int
    avg_confidence_score: float
    avg_health_score: float
    avg_shannon_index: float
    avg_simpson_index: float
    total_accepted_species: int
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
    ndvi_disclaimer: str = (
        "NDVI co-occurrence screening does not prove ecological causation."
    )


class DetectionReviewCreate(BaseModel):
    scientific_name: str = Field(..., min_length=1, max_length=255)
    decision: str = Field(..., min_length=1, max_length=32)
    notes: str | None = Field(None, max_length=2000)
    analysis_run_id: uuid.UUID | None = None


class DetectionReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recording_id: uuid.UUID
    analysis_run_id: uuid.UUID | None = None
    scientific_name: str
    reviewer_user_id: uuid.UUID
    decision: str
    notes: str | None = None
    reviewed_at: datetime
    created_at: datetime


class ReviewQueueItem(BaseModel):
    recording_id: str
    analysis_run_id: str | None = None
    recorded_at: str | None = None
    plantation_fence_id: str | None = None
    scientific_name: str | None = None
    common_name: str | None = None
    taxon_group: str | None = None
    confidence: float | None = None
    detection_tier: str | None = None
    iucn_status: str | None = None
    needs_review: bool = True


class AudioUrlOut(BaseModel):
    recording_id: uuid.UUID
    analysis_run_id: uuid.UUID | None = None
    url: str
    expires_in: int


class MonitoringPeriodCreate(BaseModel):
    fence_id: uuid.UUID
    label: str = Field(..., min_length=1, max_length=128)
    period_start: datetime
    period_end: datetime
    season_class: str = Field(default="unspecified", max_length=32)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MonitoringPeriodOut(BaseModel):
    id: uuid.UUID
    fence_id: uuid.UUID
    label: str
    period_start: datetime
    period_end: datetime
    season_class: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    @classmethod
    def from_model(cls, period) -> MonitoringPeriodOut:
        return cls(
            id=period.id,
            fence_id=period.fence_id,
            label=period.label,
            period_start=period.period_start,
            period_end=period.period_end,
            season_class=period.season_class,
            metadata=getattr(period, "metadata_", None) or {},
            created_at=period.created_at,
        )


class PeriodComparisonOut(BaseModel):
    period_a_id: str
    period_b_id: str
    fence_id: str
    comparable: bool
    compatibility: dict[str, Any]
    period_a: dict[str, Any]
    period_b: dict[str, Any]
    species_gained: list[str] = Field(default_factory=list)
    species_lost: list[str] = Field(default_factory=list)
    species_retained: list[str] = Field(default_factory=list)
    confidence_delta: float = 0.0


class InterpretationChainOut(BaseModel):
    recording_id: str
    status: str
    chain: list[dict[str, Any]]


class HotspotOut(BaseModel):
    scientific_name: str
    recording_count: int
    recording_ids: list[str]
    longitude: float
    latitude: float
    definition: str


class AuditBundleOut(BaseModel):
    bundle_type: str
    generated_at: str
    methodology_version: str
    fence_id: str
    fence_name: str
    recording_count: int
    recordings: list[dict[str, Any]]
    reviewer_log: list[dict[str, Any]]
    bundle_hash: str


class MonitoringPlanOut(BaseModel):
    id: str
    project_id: str
    fence_id: str | None = None
    scheme_code: str | None = None
    protocol_key: str
    label: str
    cadence_days: int
    min_recordings_per_cycle: int
    season_class: str
    next_due_at: str
    last_completed_at: str | None = None
    status: str
    recordings_in_cycle: int = 0
    guidance: str | None = None


class BaselineDeltaOut(BaseModel):
    fence_id: str
    snapshot_id: str | None = None
    snapshot_captured_at: str | None = None
    baseline_species_count: int
    detected_accepted_count: int
    confirmed_overlap: list[str] = Field(default_factory=list)
    novel_detections: list[str] = Field(default_factory=list)
    baseline_not_yet_detected: list[str] = Field(default_factory=list)
    overlap_pct: float = 0.0


class TrendPointOut(BaseModel):
    recording_id: str
    recorded_at: str | None = None
    accepted_species_count: int
    biodiversity_confidence_score: float
    shannon_diversity_index: float | None = None


class FenceTrendsOut(BaseModel):
    fence_id: str
    recording_count: int
    confidence_trend: str
    species_trend: str
    series: list[TrendPointOut] = Field(default_factory=list)


class ComplianceEvidenceCreate(BaseModel):
    project_id: uuid.UUID
    checklist_code: str = Field(..., min_length=1, max_length=64)
    checklist_item_id: str = Field(..., min_length=1, max_length=64)
    notes: str | None = Field(None, max_length=2000)


class ComplianceEvidenceOut(BaseModel):
    id: str
    recording_id: str
    checklist_code: str
    checklist_item_id: str
    linked_at: str
    notes: str | None = None
    export_ready: bool = False
    export_blockers: list[str] = Field(default_factory=list)
    recorded_at: str | None = None
    accepted_species_count: int | None = None
