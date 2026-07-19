"""Intelligence hub API schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.project_member import FieldOpsSummaryOut
from app.schemas.threat_watch import SiteThreatWatchOut, ThreatWatchSummaryOut


class IntegrationsHealthOut(BaseModel):
    status: str
    integrations: dict


class SatelliteFusionSiteOut(BaseModel):
    work_area_id: str
    work_area_name: str
    project_id: str | None = None
    project_name: str | None = None
    segment: str | None = None
    sentinel: dict = Field(default_factory=dict)
    bhoonidhi: dict = Field(default_factory=dict)
    fusion_status: str
    recommended_action: str


class SatelliteFusionSummaryOut(BaseModel):
    generated_at: str
    summary: dict
    sites: list[SatelliteFusionSiteOut] = Field(default_factory=list)


class IntelligenceSummaryOut(FieldOpsSummaryOut):
    generated_at: str
    integrations: dict
    threat_summary: ThreatWatchSummaryOut
    threat_sites: list[SiteThreatWatchOut] = Field(default_factory=list)
    pest_hotspots: list[dict] = Field(default_factory=list)
    weather_alerts: list[dict] = Field(default_factory=list)
    early_warnings: list[dict] = Field(default_factory=list)
    biodiversity: dict = Field(default_factory=dict)
    satellite_fusion: dict = Field(default_factory=dict)
    highest_risk: str = "low"
    weather_alert_count: int = 0
    pest_high_count: int = 0
