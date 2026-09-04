"""Org-level BRSR disclosure profile stored on organizations.metadata_.brsr."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm.attributes import flag_modified

from app.models.organization import Organization

AssuranceLevel = Literal["none", "limited", "reasonable"]


class BrsrManualKpi(BaseModel):
    value_summary: str = Field(min_length=1, max_length=500)
    source: str | None = Field(default=None, max_length=120)


class BrsrOrgProfile(BaseModel):
    reporting_year: int | None = Field(default=None, ge=2000, le=2100)
    listed_entity: bool = False
    cin: str | None = Field(default=None, max_length=32)
    stock_exchange: str | None = Field(default=None, max_length=32)
    assurance_level: AssuranceLevel = "none"
    boundary_notes: str | None = Field(default=None, max_length=2000)
    manual_kpis: dict[str, BrsrManualKpi] = Field(default_factory=dict)
    wizard_completed_steps: list[str] = Field(default_factory=list)


class BrsrOrgProfileUpdate(BaseModel):
    reporting_year: int | None = Field(default=None, ge=2000, le=2100)
    listed_entity: bool | None = None
    cin: str | None = Field(default=None, max_length=32)
    stock_exchange: str | None = Field(default=None, max_length=32)
    assurance_level: AssuranceLevel | None = None
    boundary_notes: str | None = Field(default=None, max_length=2000)
    manual_kpis: dict[str, BrsrManualKpi] | None = None
    wizard_completed_steps: list[str] | None = None


def get_brsr_profile(org: Organization) -> BrsrOrgProfile:
    raw = (org.metadata_ or {}).get("brsr") or {}
    if not isinstance(raw, dict):
        return BrsrOrgProfile()
    manual = {}
    for key, val in (raw.get("manual_kpis") or {}).items():
        if isinstance(val, dict):
            manual[str(key)] = BrsrManualKpi.model_validate(val)
    return BrsrOrgProfile(
        reporting_year=raw.get("reporting_year"),
        listed_entity=bool(raw.get("listed_entity")),
        cin=raw.get("cin"),
        stock_exchange=raw.get("stock_exchange"),
        assurance_level=raw.get("assurance_level") or "none",
        boundary_notes=raw.get("boundary_notes"),
        manual_kpis=manual,
        wizard_completed_steps=list(raw.get("wizard_completed_steps") or []),
    )


def save_brsr_profile(org: Organization, update: BrsrOrgProfileUpdate) -> BrsrOrgProfile:
    current = get_brsr_profile(org)
    data = current.model_dump()
    patch = update.model_dump(exclude_unset=True)
    if "manual_kpis" in patch and patch["manual_kpis"] is not None:
        merged_manual = dict(data.get("manual_kpis") or {})
        for key, val in patch["manual_kpis"].items():
            merged_manual[key] = val
        patch["manual_kpis"] = merged_manual
    data.update(patch)
    profile = BrsrOrgProfile.model_validate(data)

    meta = dict(org.metadata_ or {})
    meta["brsr"] = {
        "reporting_year": profile.reporting_year,
        "listed_entity": profile.listed_entity,
        "cin": profile.cin,
        "stock_exchange": profile.stock_exchange,
        "assurance_level": profile.assurance_level,
        "boundary_notes": profile.boundary_notes,
        "manual_kpis": {
            key: val.model_dump() for key, val in profile.manual_kpis.items()
        },
        "wizard_completed_steps": profile.wizard_completed_steps,
    }
    org.metadata_ = meta
    flag_modified(org, "metadata_")
    return profile


def profile_disclosure_complete(profile: BrsrOrgProfile) -> bool:
    return bool(profile.reporting_year and profile.cin and profile.listed_entity is not None)


def profile_to_dict(profile: BrsrOrgProfile) -> dict[str, Any]:
    return {
        "reporting_year": profile.reporting_year,
        "listed_entity": profile.listed_entity,
        "cin": profile.cin,
        "stock_exchange": profile.stock_exchange,
        "assurance_level": profile.assurance_level,
        "boundary_notes": profile.boundary_notes,
        "manual_kpis": {k: v.model_dump() for k, v in profile.manual_kpis.items()},
        "wizard_completed_steps": profile.wizard_completed_steps,
        "disclosure_complete": profile_disclosure_complete(profile),
    }
