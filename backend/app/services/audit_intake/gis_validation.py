"""GIS validation for audit intake boundaries."""

from __future__ import annotations

from typing import Any

from shapely.geometry import shape
from shapely.validation import explain_validity


def validate_boundaries(
    boundaries: list[dict[str, Any]],
    exclusions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Run geometry checks on boundary GeoJSON dicts.

    Each boundary dict: {id, name, geometry (GeoJSON), area_ha_claimed, area_ha_measured}
    """
    issues: list[dict[str, Any]] = []
    checks: dict[str, Any] = {
        "boundary_count": len(boundaries),
        "exclusion_count": len(exclusions or []),
        "valid_geometries": 0,
        "overlaps": 0,
        "area_mismatches": 0,
    }

    shapes: list[tuple[str, str, Any]] = []
    for b in boundaries:
        bid = str(b.get("id", ""))
        name = b.get("name") or bid
        geom_json = b.get("geometry")
        if not geom_json:
            issues.append(
                {"code": "missing_geometry", "boundary_id": bid, "message": f"{name}: no geometry"}
            )
            continue
        geom = shape(geom_json)
        if geom.is_empty:
            issues.append(
                {"code": "empty_geometry", "boundary_id": bid, "message": f"{name}: empty polygon"}
            )
            continue
        if not geom.is_valid:
            issues.append(
                {
                    "code": "invalid_geometry",
                    "boundary_id": bid,
                    "message": f"{name}: {explain_validity(geom)}",
                }
            )
            continue
        checks["valid_geometries"] += 1
        shapes.append((bid, name, geom))

        claimed = b.get("area_ha_claimed")
        measured = b.get("area_ha_measured")
        if claimed and measured:
            pct = abs(float(measured) - float(claimed)) / max(float(claimed), 0.01) * 100
            if pct > 20:
                checks["area_mismatches"] += 1
                issues.append(
                    {
                        "code": "area_mismatch",
                        "boundary_id": bid,
                        "message": f"{name}: claimed {claimed} ha vs measured {measured} ha ({pct:.0f}% diff)",
                    }
                )

    for i, (id_a, name_a, geom_a) in enumerate(shapes):
        for id_b, name_b, geom_b in shapes[i + 1 :]:
            if geom_a.intersects(geom_b):
                overlap_area = geom_a.intersection(geom_b).area
                if overlap_area > 1e-10:
                    checks["overlaps"] += 1
                    issues.append(
                        {
                            "code": "boundary_overlap",
                            "boundary_ids": [id_a, id_b],
                            "message": f"{name_a} overlaps {name_b}",
                        }
                    )

    if exclusions:
        for ex in exclusions:
            ex_geom = shape(ex.get("geometry") or {})
            if ex_geom.is_empty or not ex_geom.is_valid:
                continue
            for bid, name, bgeom in shapes:
                if ex_geom.intersects(bgeom) and not bgeom.contains(ex_geom):
                    issues.append(
                        {
                            "code": "exclusion_spillover",
                            "boundary_id": bid,
                            "message": f"Exclusion '{ex.get('name')}' extends outside {name}",
                        }
                    )

    status = "pass"
    if any(i["code"] in {"invalid_geometry", "empty_geometry", "missing_geometry"} for i in issues):
        status = "fail"
    elif issues:
        status = "warn"

    return {"status": status, "checks": checks, "issues": issues}
