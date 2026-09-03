"""Non-binding species suggestions from project geography and planting scheme."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.planting_project import PlantingProject
from app.services.carbon.species_catalog import by_name
from app.services.planting_projects.constants import SEGMENT_LABELS
from app.services.planting_projects.species_geography import (
    SEGMENT_SPECIES,
    district_species,
    normalize_state_code,
    state_species,
)
from app.services.schemes.registry import get_scheme


@dataclass
class SpeciesSuggestion:
    common_name: str
    scientific_name: str | None = None
    score: int = 0
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "common_name": self.common_name,
            "scientific_name": self.scientific_name,
            "score": self.score,
            "reasons": self.reasons,
        }


def _location_from_project(project: PlantingProject) -> dict[str, str]:
    meta = project.metadata_ or {}
    loc = meta.get("location")
    if not isinstance(loc, dict):
        loc = {}
    refs = meta.get("scheme_refs")
    refs = refs if isinstance(refs, dict) else {}
    return {
        "state_code": str(loc.get("state_code") or refs.get("state_code") or "").strip(),
        "state_name": str(loc.get("state_name") or refs.get("state_name") or "").strip(),
        "district_code": str(loc.get("district_code") or refs.get("district_code") or "").strip(),
        "district_name": str(
            loc.get("district_name") or refs.get("district") or refs.get("district_name") or ""
        ).strip(),
    }


def _scheme_label(scheme_code: str | None, segment: str) -> str:
    if scheme_code:
        scheme = get_scheme(scheme_code)
        if scheme:
            return str(scheme.get("label") or scheme_code)
    return SEGMENT_LABELS.get(segment, segment.replace("_", " ").title())


def _segment_label(segment: str) -> str:
    return SEGMENT_LABELS.get(segment, segment.replace("_", " ").title())


def _accumulate(
    bucket: dict[str, SpeciesSuggestion],
    name: str,
    *,
    score: int,
    reason: str,
) -> None:
    key = name.strip().lower()
    if not key:
        return
    catalog = by_name(name)
    display = catalog.common_name if catalog else name.strip()
    if key not in bucket:
        bucket[key] = SpeciesSuggestion(
            common_name=display,
            scientific_name=catalog.scientific_name if catalog else None,
        )
    entry = bucket[key]
    entry.score += score
    if reason not in entry.reasons:
        entry.reasons.append(reason)


def recommend_species(
    *,
    state_code: str | None = None,
    state_name: str | None = None,
    district_code: str | None = None,
    district_name: str | None = None,
    segment: str = "general",
    scheme_code: str | None = None,
    rules: dict[str, Any] | None = None,
    limit: int = 12,
) -> dict[str, Any]:
    """Return ranked, non-binding species suggestions."""
    rules = rules or {}
    norm_state = normalize_state_code(state_code)
    geo_state_name = (state_name or "").strip() or "this state"
    geo_district_name = (district_name or "").strip() or "this district"
    scheme_label = _scheme_label(scheme_code, segment)
    segment_label = _segment_label(segment)

    bucket: dict[str, SpeciesSuggestion] = {}

    for sp in state_species(norm_state):
        _accumulate(
            bucket,
            sp,
            score=3,
            reason=f"Native to {geo_state_name}",
        )

    for sp in district_species(district_code):
        _accumulate(
            bucket,
            sp,
            score=2,
            reason=f"Common in {geo_district_name}",
        )

    examples = rules.get("native_species_examples")
    if isinstance(examples, list):
        for raw in examples:
            if isinstance(raw, str) and raw.strip():
                _accumulate(
                    bucket,
                    raw,
                    score=4,
                    reason=f"Recommended for {scheme_label}",
                )

    for sp in SEGMENT_SPECIES.get(segment, SEGMENT_SPECIES.get("general", [])):
        _accumulate(
            bucket,
            sp,
            score=2,
            reason=f"Suited to {segment_label} projects",
        )

    ranked = sorted(bucket.values(), key=lambda s: (-s.score, s.common_name.lower()))
    suggestions = [s.to_dict() for s in ranked[:limit]]

    return {
        "suggestions": suggestions,
        "binding": False,
        "disclaimer": (
            "Suggestions only — you may register species not listed here. "
            "Compliance rules (if any) still apply to allowed species and native % targets."
        ),
        "context": {
            "state_code": norm_state,
            "state_name": state_name,
            "district_code": district_code or None,
            "district_name": district_name,
            "segment": segment,
            "scheme_code": scheme_code,
            "scheme_label": scheme_label,
            "segment_label": segment_label,
            "has_location": bool(norm_state),
        },
    }


def recommend_for_project(
    project: PlantingProject,
    *,
    rules: dict[str, Any] | None,
    state_code: str | None = None,
    state_name: str | None = None,
    district_code: str | None = None,
    district_name: str | None = None,
    limit: int = 12,
) -> dict[str, Any]:
    loc = _location_from_project(project)
    return recommend_species(
        state_code=state_code or loc["state_code"] or None,
        state_name=state_name or loc["state_name"] or None,
        district_code=district_code or loc["district_code"] or None,
        district_name=district_name or loc["district_name"] or None,
        segment=project.segment or "general",
        scheme_code=project.scheme_code,
        rules=rules,
        limit=limit,
    )
