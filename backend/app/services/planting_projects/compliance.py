"""Compliance evaluation for tree placement inside work areas."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence
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
    photo_count: int,
    metadata: dict[str, Any] | None = None,
    exclude_tree_id: uuid.UUID | None = None,
) -> ComplianceResult:
    issues: list[ComplianceIssue] = []
    metadata = metadata or {}

    if compliance_mode == "open":
        return ComplianceResult(passed=True, mode=compliance_mode, issues=[])

    if work_area is None:
        msg = "Select a work area before registering a tree in this project."
        if compliance_mode == "strict":
            issues.append(
                ComplianceIssue("work_area_required", "block", msg)
            )
        else:
            issues.append(
                ComplianceIssue("work_area_required", "warn", msg)
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
        msg = "Tree location is outside the approved work area boundary."
        issues.append(
            ComplianceIssue(
                "outside_boundary",
                "block" if compliance_mode == "strict" else "warn",
                msg,
                {"work_area_id": str(work_area.id)},
            )
        )

    max_acc = rules.get("max_gps_accuracy_m")
    if max_acc is not None and accuracy_m is not None and accuracy_m > float(max_acc):
        issues.append(
            ComplianceIssue(
                "gps_accuracy_poor",
                "block" if compliance_mode == "strict" else "warn",
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
                        "block" if compliance_mode == "strict" else "warn",
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
                "block" if compliance_mode == "strict" else "warn",
                f"Species '{species_text}' is not in the approved list for this work area.",
                {"species_text": species_text},
            )
        )

    min_photos = rules.get("min_photos")
    if min_photos is not None and photo_count < int(min_photos):
        issues.append(
            ComplianceIssue(
                "min_photos",
                "block" if compliance_mode == "strict" else "warn",
                f"At least {min_photos} photos are required.",
                {"photo_count": photo_count, "min_photos": min_photos},
            )
        )

    pit_rules = rules.get("pit_size_cm")
    if pit_rules and compliance_mode == "strict":
        pit_val = metadata.get("pit_size_cm")
        if not pit_val:
            issues.append(
                ComplianceIssue(
                    "pit_size_missing",
                    "audit",
                    "Pit size was not recorded; verify against the planting standard.",
                )
            )

    chainage_km: float | None = None
    if rules.get("chainage_enabled") and work_area.geometry_type == "corridor":
        source = (work_area.metadata_ or {}).get("source_geometry")
        if source:
            chainage_km = chainage_km_along_line(source, latitude, longitude)

    blocking = [i for i in issues if i.severity == "block"]
    passed = len(blocking) == 0
    if compliance_mode == "guided" and not passed:
        # Guided mode allows save but surfaces warnings; only true blocks fail.
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
