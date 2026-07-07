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

    # Notifications
    ses_sender: str = "no-reply@byot.earth"
    sns_sms_sender_id: str = "BYOT"
    fcm_server_key: str | None = None

    # Carbon engine defaults
    default_credit_price_usd: float = Field(default=12.0)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
