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
    sar_provider: Literal["stub", "gee", "sentinel_hub"] = "stub"
    sar_enabled: bool = True

    # Weather (Open-Meteo — free, no API key)
    open_meteo_api_url: str = "https://api.open-meteo.com/v1"

    # OAuth
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    # OTP — set auth_otp_sms_enabled=true when MSG91/SNS is wired
    auth_otp_sms_enabled: bool = False
    # Dev-only: accept OTP 000000 and return codes in API responses.
    # Defaults on for development/test; forced off for staging/production unless
    # explicitly overridden (production_guards rejects True in hardened envs).
    auth_allow_dev_otp: bool | None = None
    # Expose Prometheus /metrics (default off in staging/production)
    expose_metrics: bool | None = None
    # Expose /docs /redoc /openapi.json (default off in staging/production)
    expose_api_docs: bool | None = None
    # Email OTP — Gmail API + Google Workspace domain delegation
    auth_otp_email_enabled: bool = False
    gmail_sender: str | None = None
    google_service_account_json: str | None = None
    # Org invite notifications (independent toggles — enable when keys are ready)
    auth_org_invite_sms_enabled: bool = False
    auth_org_invite_email_enabled: bool = False
    # Program access onboarding (professional signup approval queue)
    auth_program_access_email_enabled: bool = False
    # MSG91 (India) — https://msg91.com
    msg91_auth_key: str | None = None
    msg91_sender_id: str | None = None
    msg91_otp_template_id: str | None = None
    msg91_invite_template_id: str | None = None

    # CAPTCHA (Cloudflare Turnstile) — set secret to enable on login/register
    turnstile_site_key: str | None = None
    turnstile_secret_key: str | None = None

    @property
    def captcha_enabled(self) -> bool:
        return bool(self.turnstile_secret_key and self.turnstile_site_key)

    @property
    def google_oauth_redirect_uri(self) -> str:
        """OAuth callback via the app origin so Google only needs the site domain authorized."""
        configured = self.google_redirect_uri
        frontend = self.app_frontend_url.rstrip("/")
        if not frontend or not configured:
            return configured
        api_host = configured.split("://", 1)[-1].split("/")[0]
        if api_host.startswith("api."):
            return f"{frontend}/api/v1/auth/google/callback"
        return configured

    @property
    def allow_dev_otp(self) -> bool:
        """Whether universal OTP 000000 and API OTP hints are permitted."""
        if self.auth_allow_dev_otp is not None:
            return self.auth_allow_dev_otp
        return self.app_env in {"development", "test"}

    @property
    def metrics_exposed(self) -> bool:
        if self.expose_metrics is not None:
            return self.expose_metrics
        return self.app_env in {"development", "test"} or self.app_debug

    @property
    def api_docs_exposed(self) -> bool:
        if self.expose_api_docs is not None:
            return self.expose_api_docs
        return self.app_env in {"development", "test"} or self.app_debug

    # Notifications
    ses_sender: str = "no-reply@byot.earth"
    sns_sms_sender_id: str = "BYOT"
    fcm_server_key: str | None = None

    # Carbon engine defaults
    default_credit_price_usd: float = Field(default=12.0)

    # BYOT citizen AI scan metering (professional programs are unlimited)
    byot_free_ai_scans: int = Field(default=5, ge=0)

    # Razorpay — BYOT AI scan pack purchases (test keys in .env, never commit secrets)
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None

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

    # Intelligence cache (Redis)
    intelligence_cache_ttl_seconds: int = Field(default=600, ge=60, le=3600)

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
