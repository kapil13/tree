"""Compliance evaluation for tree placement inside work areas."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence
from app.models.species import Species
from app.models.tree import Tree
from app.services.geo import chainage_km_along_line
from app.services.planting_projects.constants import ComplianceMode


@dataclass
class ComplianceIssue:
    violation_type: str
    severity: str
    message: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ComplianceResult:
    passed: bool
    mode: ComplianceMode
    issues: list[ComplianceIssue] = field(default_factory=list)
    chainage_km: float | None = None

    @property
    def blocking_issues(self) -> list[ComplianceIssue]:
        return [i for i in self.issues if i.severity == "block"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "mode": self.mode,
            "chainage_km": self.chainage_km,
            "issues": [
                {
                    "violation_type": i.violation_type,
                    "severity": i.severity,
                    "message": i.message,
                    "metadata": i.metadata,
                }
                for i in self.issues
            ],
        }


def _species_allowed(species_text: str | None, allowed: list[str] | None) -> bool:
    if not allowed:
        return True
    if not species_text:
        return False
    normalized = species_text.strip().lower()
    return any(normalized == a.strip().lower() for a in allowed)


def _parse_pit_size_cm(value: Any) -> tuple[float, float, float] | None:
    if isinstance(value, dict):
        length = value.get("length") or value.get("l")
        width = value.get("width") or value.get("w")
        depth = value.get("depth") or value.get("d")
        if length is not None and width is not None and depth is not None:
            return float(length), float(width), float(depth)
    if isinstance(value, str):
        parts = re.split(r"[x×*]", value.strip())
        if len(parts) == 3:
            try:
                return tuple(float(p.strip()) for p in parts)  # type: ignore[return-value]
            except ValueError:
                return None
    return None


def _tree_is_native(metadata: dict[str, Any] | None, species: Species | None = None) -> bool:
    meta = metadata or {}
    flag = meta.get("species_native")
    if flag is True or str(flag).lower() in ("true", "yes", "1", "native"):
        return True
    if flag is False or str(flag).lower() in ("false", "no", "0", "exotic"):
        return False
    if species and species.native_regions:
        return len(species.native_regions) > 0
    return False


async def work_area_tree_count(
    db: AsyncSession,
    work_area_id: uuid.UUID,
    *,
    exclude_tree_id: uuid.UUID | None = None,
) -> int:
    stmt = select(func.count()).where(
        Tree.plantation_id == work_area_id,
        Tree.status != "removed",
    )
    if exclude_tree_id:
        stmt = stmt.where(Tree.id != exclude_tree_id)
    return int((await db.execute(stmt)).scalar_one() or 0)


async def work_area_native_stats(
    db: AsyncSession,
    work_area_id: uuid.UUID,
    *,
    exclude_tree_id: uuid.UUID | None = None,
) -> tuple[int, int]:
    stmt = select(Tree).where(
        Tree.plantation_id == work_area_id,
        Tree.status != "removed",
    )
    if exclude_tree_id:
        stmt = stmt.where(Tree.id != exclude_tree_id)
    trees = list((await db.execute(stmt)).scalars().all())
    species_ids = {t.species_id for t in trees if t.species_id}
    species_map: dict[uuid.UUID, Species] = {}
    if species_ids:
        res = await db.execute(select(Species).where(Species.id.in_(species_ids)))
        species_map = {s.id: s for s in res.scalars().all()}

    native = 0
    for tree in trees:
        sp = species_map.get(tree.species_id) if tree.species_id else None
        if _tree_is_native(tree.metadata_, sp):
            native += 1
    return native, len(trees)


async def nearest_tree_distance_m(
    db: AsyncSession,
    *,
    work_area_id: uuid.UUID,
    lon: float,
    lat: float,
    exclude_tree_id: uuid.UUID | None = None,
) -> float | None:
    point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    stmt = select(
        func.ST_Distance(
            Tree.location,
            point,
        )
    ).where(Tree.plantation_id == work_area_id, Tree.status != "removed")
    if exclude_tree_id:
        stmt = stmt.where(Tree.id != exclude_tree_id)
    stmt = stmt.order_by(func.ST_Distance(Tree.location, point)).limit(1)
    res = await db.execute(stmt)
    dist = res.scalar_one_or_none()
    return float(dist) if dist is not None else None


async def point_inside_work_area(
    db: AsyncSession,
    *,
    work_area: PlantationFence,
    lon: float,
    lat: float,
) -> bool:
    point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    res = await db.execute(
        select(func.ST_Contains(work_area.boundary, point))
    )
    return bool(res.scalar_one())


def _issue_severity(compliance_mode: ComplianceMode, *, block: bool = True) -> str:
    if block and compliance_mode == "strict":
        return "block"
    return "warn"


async def evaluate_tree_placement(
    db: AsyncSession,
    *,
    project: PlantingProject | None,
    work_area: PlantationFence | None,
    rules: dict[str, Any],
    compliance_mode: ComplianceMode,
    latitude: float,
    longitude: float,
    accuracy_m: float | None,
    species_text: str | None,
    species_id: uuid.UUID | None = None,
    photo_count: int,
    metadata: dict[str, Any] | None = None,
    exclude_tree_id: uuid.UUID | None = None,
) -> ComplianceResult:
    issues: list[ComplianceIssue] = []
    metadata = dict(metadata or {})

    if compliance_mode == "open":
        return ComplianceResult(passed=True, mode=compliance_mode, issues=[])

    if work_area is None:
        msg = "Select a work area before registering a tree in this project."
        issues.append(
            ComplianceIssue(
                "work_area_required",
                "block" if compliance_mode == "strict" else "warn",
                msg,
            )
        )
        return ComplianceResult(
            passed=compliance_mode != "strict",
            mode=compliance_mode,
            issues=issues,
        )

    inside = await point_inside_work_area(
        db, work_area=work_area, lon=longitude, lat=latitude
    )
    if not inside:
        issues.append(
            ComplianceIssue(
                "outside_boundary",
                _issue_severity(compliance_mode),
                "Tree location is outside the approved work area boundary.",
                {"work_area_id": str(work_area.id)},
            )
        )

    max_acc = rules.get("max_gps_accuracy_m")
    if max_acc is not None and accuracy_m is not None and accuracy_m > float(max_acc):
        issues.append(
            ComplianceIssue(
                "gps_accuracy_poor",
                _issue_severity(compliance_mode),
                f"GPS accuracy {accuracy_m:.1f} m exceeds limit of {max_acc} m.",
                {"accuracy_m": accuracy_m, "max_gps_accuracy_m": max_acc},
            )
        )

    spacing = rules.get("spacing_m") or {}
    min_spacing = spacing.get("min")
    warn_below = spacing.get("warn_below", min_spacing)
    if min_spacing is not None:
        nearest = await nearest_tree_distance_m(
            db,
            work_area_id=work_area.id,
            lon=longitude,
            lat=latitude,
            exclude_tree_id=exclude_tree_id,
        )
        if nearest is not None:
            if nearest < float(min_spacing):
                issues.append(
                    ComplianceIssue(
                        "spacing_too_close",
                        _issue_severity(compliance_mode),
                        f"Nearest tree is {nearest:.1f} m away; minimum spacing is {min_spacing} m.",
                        {"nearest_m": nearest, "min_spacing_m": min_spacing},
                    )
                )
            elif warn_below is not None and nearest < float(warn_below):
                issues.append(
                    ComplianceIssue(
                        "spacing_too_close",
                        "warn",
                        f"Nearest tree is {nearest:.1f} m away; recommended spacing is {min_spacing} m.",
                        {"nearest_m": nearest, "min_spacing_m": min_spacing},
                    )
                )

    allowed_species = rules.get("allowed_species")
    if allowed_species and not _species_allowed(species_text, allowed_species):
        issues.append(
            ComplianceIssue(
                "species_not_allowed",
                _issue_severity(compliance_mode),
                f"Species '{species_text}' is not in the approved list for this work area.",
                {"species_text": species_text},
            )
        )

    min_photos = rules.get("min_photos")
    if min_photos is not None and photo_count < int(min_photos):
        issues.append(
            ComplianceIssue(
                "min_photos",
                _issue_severity(compliance_mode),
                f"At least {min_photos} photos are required.",
                {"photo_count": photo_count, "min_photos": min_photos},
            )
        )

    # Pit size — NHAI 60×60×60 cm
    pit_rules = rules.get("pit_size_cm")
    if pit_rules and compliance_mode in ("strict", "guided"):
        pit_val = metadata.get("pit_size_cm")
        parsed = _parse_pit_size_cm(pit_val) if pit_val else None
        req_l = float(pit_rules.get("length", 0))
        req_w = float(pit_rules.get("width", 0))
        req_d = float(pit_rules.get("depth", 0))
        if compliance_mode == "strict" and not parsed:
            issues.append(
                ComplianceIssue(
                    "pit_size_missing",
                    "block",
                    f"Pit size is required (minimum {req_l:.0f}×{req_w:.0f}×{req_d:.0f} cm).",
                    {"required_cm": pit_rules},
                )
            )
        elif parsed and req_l and req_w and req_d:
            l, w, d = parsed
            if l < req_l or w < req_w or d < req_d:
                issues.append(
                    ComplianceIssue(
                        "pit_size_insufficient",
                        _issue_severity(compliance_mode),
                        (
                            f"Pit {l:.0f}×{w:.0f}×{d:.0f} cm is below standard "
                            f"{req_l:.0f}×{req_w:.0f}×{req_d:.0f} cm."
                        ),
                        {"pit_size_cm": {"length": l, "width": w, "depth": d}, "required_cm": pit_rules},
                    )
                )

    # Guard type — NHAI requires bamboo/iron/cement guard
    if rules.get("guard_type_required"):
        guard = metadata.get("guard_type")
        if not guard:
            issues.append(
                ComplianceIssue(
                    "guard_type_missing",
                    _issue_severity(compliance_mode),
                    "Tree protection guard type is required (bamboo, iron, or cement).",
                )
            )
        elif str(guard).lower() == "none":
            issues.append(
                ComplianceIssue(
                    "guard_type_invalid",
                    _issue_severity(compliance_mode),
                    "NHAI/ESG standards require a physical tree guard — 'none' is not accepted.",
                    {"guard_type": guard},
                )
            )

    # Layout pattern — NHAI single row requires road side
    layout = rules.get("layout_pattern")
    if layout == "single_row" and compliance_mode in ("strict", "guided"):
        road_side = metadata.get("road_side")
        if not road_side:
            issues.append(
                ComplianceIssue(
                    "layout_road_side_missing",
                    _issue_severity(compliance_mode),
                    "Highway planting requires road side (LHS, RHS, median, or service road).",
                    {"layout_pattern": layout},
                )
            )

    if rules.get("require_pit_photo") and not metadata.get("pit_photo_confirmed"):
        issues.append(
            ComplianceIssue(
                "pit_photo_missing",
                _issue_severity(compliance_mode),
                "A pit photograph is required before planting confirmation.",
            )
        )

    # Planting density per hectare — ESG green belt
    density_rules = rules.get("planting_density_per_ha")
    area_ha = float(work_area.area_ha) if work_area.area_ha else None
    if density_rules and area_ha and area_ha > 0:
        tree_count = await work_area_tree_count(
            db, work_area.id, exclude_tree_id=exclude_tree_id
        )
        projected_density = (tree_count + 1) / area_ha
        d_min = density_rules.get("min")
        d_max = density_rules.get("max")
        if d_max is not None and projected_density > float(d_max):
            issues.append(
                ComplianceIssue(
                    "density_out_of_range",
                    _issue_severity(compliance_mode),
                    (
                        f"Adding this tree would reach {projected_density:.0f} trees/ha; "
                        f"maximum allowed is {d_max} trees/ha."
                    ),
                    {
                        "projected_density_per_ha": round(projected_density, 1),
                        "max_density_per_ha": d_max,
                        "area_ha": area_ha,
                    },
                )
            )
        elif d_min is not None and projected_density < float(d_min):
            issues.append(
                ComplianceIssue(
                    "density_below_minimum",
                    "warn",
                    (
                        f"After planting, density will be {projected_density:.0f} trees/ha; "
                        f"target minimum is {d_min} trees/ha for this green belt."
                    ),
                    {
                        "projected_density_per_ha": round(projected_density, 1),
                        "min_density_per_ha": d_min,
                    },
                )
            )

    # Native species percentage — ESG industrial greenbelt
    native_pct_min = rules.get("species_native_pct_min")
    if native_pct_min is not None and compliance_mode in ("strict", "guided"):
        native_count, total = await work_area_native_stats(
            db, work_area.id, exclude_tree_id=exclude_tree_id
        )
        species: Species | None = None
        if species_id:
            res = await db.execute(select(Species).where(Species.id == species_id))
            species = res.scalar_one_or_none()
        new_is_native = _tree_is_native(metadata, species)
        projected_native = native_count + (1 if new_is_native else 0)
        projected_total = total + 1
        projected_pct = 100.0 * projected_native / projected_total if projected_total else 0.0
        if projected_pct < float(native_pct_min):
            issues.append(
                ComplianceIssue(
                    "native_species_pct_low",
                    _issue_severity(compliance_mode),
                    (
                        f"Native species share would be {projected_pct:.0f}% after this tree; "
                        f"minimum required is {native_pct_min}% for ESG green belt compliance."
                    ),
                    {
                        "projected_native_pct": round(projected_pct, 1),
                        "min_native_pct": native_pct_min,
                        "new_tree_native": new_is_native,
                    },
                )
            )

    chainage_km: float | None = None
    if rules.get("chainage_enabled") and work_area.geometry_type == "corridor":
        source = (work_area.metadata_ or {}).get("source_geometry")
        if source:
            chainage_km = chainage_km_along_line(source, latitude, longitude)
            start = work_area.chainage_start_km
            end = work_area.chainage_end_km
            if chainage_km is not None and start is not None and end is not None:
                if chainage_km < float(start) or chainage_km > float(end):
                    issues.append(
                        ComplianceIssue(
                            "chainage_out_of_range",
                            _issue_severity(compliance_mode),
                            (
                                f"Chainage {chainage_km:.2f} km is outside work area "
                                f"range {start}–{end} km."
                            ),
                            {
                                "chainage_km": chainage_km,
                                "chainage_start_km": start,
                                "chainage_end_km": end,
                            },
                        )
                    )

    blocking = [i for i in issues if i.severity == "block"]
    passed = len(blocking) == 0

    return ComplianceResult(
        passed=passed,
        mode=compliance_mode,
        issues=issues,
        chainage_km=chainage_km,
    )


async def persist_violations(
    db: AsyncSession,
    *,
    result: ComplianceResult,
    project_id: uuid.UUID | None,
    work_area_id: uuid.UUID | None,
    tree_id: uuid.UUID | None,
) -> None:
    from app.models.planting_compliance_violation import PlantingComplianceViolation

    for issue in result.issues:
        if issue.severity == "audit":
            continue
        db.add(
            PlantingComplianceViolation(
                project_id=project_id,
                work_area_id=work_area_id,
                tree_id=tree_id,
                violation_type=issue.violation_type,
                severity=issue.severity,
                message=issue.message,
                metadata_=issue.metadata,
            )
        )
