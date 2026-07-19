"""Intelligence hub API schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.project_member import FieldOpsSummaryOut
from app.schemas.threat_watch import SiteThreatWatchOut, ThreatWatchSummaryOut


class IntegrationsHealthOut(BaseModel):
    status: str
    integrations: dict


class IntelligenceSummaryOut(FieldOpsSummaryOut):
    generated_at: str
    integrations: dict
    threat_summary: ThreatWatchSummaryOut
    threat_sites: list[SiteThreatWatchOut] = Field(default_factory=list)
    pest_hotspots: list[dict] = Field(default_factory=list)
    weather_alerts: list[dict] = Field(default_factory=list)
    early_warnings: list[dict] = Field(default_factory=list)
    biodiversity: dict = Field(default_factory=dict)
    highest_risk: str = "low"
    weather_alert_count: int = 0
    pest_high_count: int = 0
