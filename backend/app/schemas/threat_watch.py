"""Threat watch schemas for dashboard."""

from __future__ import annotations

from pydantic import BaseModel, Field


class WeatherAlertOut(BaseModel):
    kind: str
    severity: str
    title: str
    message: str
    date: str | None = None


class EarlyWarningOut(BaseModel):
    kind: str
    severity: str
    title: str
    message: str
    source: str = "composite"
    distance_km: float | None = None


class PreparednessBriefOut(BaseModel):
    headline: str
    meaning: str
    prepare: list[str] = Field(default_factory=list)
    urgency: str = "monitor"
    category: str = "general"


class FireWatchOut(BaseModel):
    risk_level: str | None = None
    fire_count: int = 0
    nearest_km: float | None = None
    source: str | None = None


class FloodExtentWatchOut(BaseModel):
    risk_level: str | None = None
    water_extent_score: float | None = None
    delta_score: float | None = None
    rain_mm_48h: float | None = None


class SiteThreatWatchOut(BaseModel):
    work_area_id: str
    work_area_name: str
    project_id: str | None = None
    project_name: str | None = None
    latitude: float
    longitude: float
    composite_risk: str
    pest_control_needed: bool = False
    disease_control_needed: bool = False
    rain_mm_next_48h: float = 0
    ndvi_trend: str | None = None
    healthy_pct: float | None = None
    tree_count: int = 0
    weather_alerts: list[WeatherAlertOut] = Field(default_factory=list)
    early_warnings: list[EarlyWarningOut] = Field(default_factory=list)
    fire_watch: FireWatchOut | None = None
    flood_extent_watch: FloodExtentWatchOut | None = None
    forecast_summary: str = ""
    recommended_actions: list[str] = Field(default_factory=list)
    preparedness_brief: PreparednessBriefOut | None = None


class ThreatWatchSummaryOut(BaseModel):
    sites_monitored: int = 0
    weather_alerts_count: int = 0
    pest_high_count: int = 0
    locust_watch_count: int = 0
    fire_watch_count: int = 0
    flood_extent_watch_count: int = 0
    highest_risk: str = "low"


class ThreatWatchResponse(BaseModel):
    generated_at: str
    summary: ThreatWatchSummaryOut
    sites: list[SiteThreatWatchOut] = Field(default_factory=list)
