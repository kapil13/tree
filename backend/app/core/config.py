"""Application configuration (12-factor, Pydantic-Settings)."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: Literal["development", "staging", "production", "test"] = "development"
    app_name: str = "byot-api"
    app_version: str = "1.0.0"
    app_debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://byot:byot@localhost:5432/byot"
    database_url_sync: str = "postgresql+psycopg2://byot:byot@localhost:5432/byot"
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # CORS
    cors_origins: str = "http://localhost:3000"
    frontend_url: str | None = None

    @property
    def app_frontend_url(self) -> str:
        if self.frontend_url:
            return self.frontend_url.rstrip("/")
        first = self.cors_origins.split(",")[0].strip()
        return first or "http://localhost:3000"

    # AWS / S3
    aws_region: str = "ap-south-1"
    s3_bucket_media: str = "byot-media-local"
    s3_endpoint_url: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # AI providers
    openai_api_key: str | None = None
    gemini_api_key: str | None = None

    # Satellite providers
    sentinel_hub_client_id: str | None = None
    sentinel_hub_client_secret: str | None = None
    sentinel_hub_api_url: str = "https://sh.dataspace.copernicus.eu"
    sentinel_hub_token_url: str = (
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    )
    gee_service_account_json: str | None = None

    # Weather (Open-Meteo — free, no API key)
    open_meteo_api_url: str = "https://api.open-meteo.com/v1"

    # OAuth
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    # OTP — set auth_otp_sms_enabled=true when MSG91/SNS is wired
    auth_otp_sms_enabled: bool = False

    # Notifications
    ses_sender: str = "no-reply@byot.earth"
    sns_sms_sender_id: str = "BYOT"
    fcm_server_key: str | None = None

    # Carbon engine defaults
    default_credit_price_usd: float = Field(default=12.0)

    # Bioacoustic pipeline (birdnet = production; composite adds Perch multi-taxa)
    bioacoustic_pipeline: Literal["stub", "birdnet", "composite", "multitaxa"] = "birdnet"
    bioacoustic_min_confidence: float = Field(default=0.15, ge=0.05, le=0.99)
    bioacoustic_return_all_detections: bool = True
    bioacoustic_noise_reduction: bool = False
    bioacoustic_enable_frogs: bool = False
    bioacoustic_enable_insects: bool = False
    bioacoustic_enable_perch: bool = False
    bioacoustic_perch_model_path: str | None = None
    bioacoustic_perch_labels_path: str | None = None
    bioacoustic_perch_min_confidence: float = Field(default=0.20, ge=0.05, le=0.99)
    bioacoustic_perch_top_k: int = Field(default=12, ge=1, le=50)
    bioacoustic_perch_hop_samples: int = Field(default=80_000, ge=16_000, le=160_000)
    bioacoustic_perch_taxa: str = "amphibian,mammal,insect,reptile"
    iucn_api_token: str | None = None
    iucn_api_url: str = "https://api.iucnredlist.org/api/v4"
    gbif_api_url: str = "https://api.gbif.org/v1"
    gbif_occurrence_radius_km: float = Field(default=25.0, ge=1.0, le=100.0)

    # ISRO Bhoonidhi (NRSC) STAC catalog — requires IP whitelist + API account
    bhoonidhi_user_id: str | None = None
    bhoonidhi_password: str | None = None
    bhoonidhi_api_url: str = "https://bhoonidhi-api.nrsc.gov.in"
    bioacoustic_review_confidence: float = Field(default=0.70, ge=0.05, le=0.99)
    bioacoustic_spl_warning_db: float = Field(default=62.0, ge=40.0, le=90.0)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
