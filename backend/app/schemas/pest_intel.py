"""Pest intelligence response schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.weather import WeatherForecast


class PestIntelOut(BaseModel):
    work_area_id: str
    work_area_name: str
    project_id: str | None = None
    project_name: str | None = None
    generated_at: str
    composite_risk: str
    pest_control_needed: bool
    disease_control_needed: bool
    ndvi_mean: float | None = None
    ndvi_trend: str | None = None
    ecosystem_score: float | None = None
    interpretation: str | None = None
    tree_count: int
    health_breakdown: dict[str, int] = Field(default_factory=dict)
    healthy_pct: float | None = None
    satellite_health: dict[str, Any] | None = None
    weather: WeatherForecast | dict[str, Any] | None = None
    rain_mm_next_48h: float = 0
    bioacoustic: dict[str, Any] = Field(default_factory=dict)
    recommended_actions: list[str] = Field(default_factory=list)
