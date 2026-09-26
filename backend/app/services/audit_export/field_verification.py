"""Field verification evidence pack for audit ZIP export."""

from __future__ import annotations

import csv
import io
import json
import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import BoundaryVersion
from app.models.audit_sampling import AuditFieldPlot, AuditFieldVisit, AuditSamplingPlan
from app.services.audit_export.field_map_pdf import render_field_verification_map_pdf
from app.services.geo import geography_point_xy, geography_to_geojson_polygon
from app.services.storage.s3 import get_storage


def _safe_filename(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())[:48] or "plot"


async def build_field_verification_pack(
    db: AsyncSession,
    engagement_id: uuid.UUID,
) -> dict[str, bytes]:
    """Return relative zip paths -> file bytes for field verification evidence."""
    files: dict[str, bytes] = {}

    plan = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement_id)
        )
    ).scalar_one_or_none()
    if plan is None:
        return files

    boundaries = (
        (
            await db.execute(
                select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
            )
        )
        .scalars()
        .all()
    )
    name_map = {b.id: b.name for b in boundaries}

    boundary_features = []
    for b in boundaries:
        boundary_features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": str(b.id),
                    "name": b.name,
                    "area_ha_measured": float(b.area_ha_measured) if b.area_ha_measured else None,
                },
                "geometry": geography_to_geojson_polygon(b.boundary),
            }
        )
    files["boundaries.geojson"] = json.dumps(
        {"type": "FeatureCollection", "features": boundary_features},
        indent=2,
    ).encode("utf-8")

    plots = (
        (
            await db.execute(
                select(AuditFieldPlot)
                .where(AuditFieldPlot.plan_id == plan.id)
                .order_by(AuditFieldPlot.priority_rank.asc(), AuditFieldPlot.plot_code.asc())
            )
        )
        .scalars()
        .all()
    )
    plot_ids = [p.id for p in plots]
    visits_by_plot: dict[uuid.UUID, list[AuditFieldVisit]] = {}
    if plot_ids:
        visits = (
            (
                await db.execute(
                    select(AuditFieldVisit)
                    .where(AuditFieldVisit.plot_id.in_(plot_ids))
                    .order_by(AuditFieldVisit.visited_at.asc())
                )
            )
            .scalars()
            .all()
        )
        for visit in visits:
            visits_by_plot.setdefault(visit.plot_id, []).append(visit)

    lon_expr, lat_expr = geography_point_xy(AuditFieldPlot.center)
    storage = get_storage()
    visit_rows: list[dict[str, Any]] = []
    csv_rows: list[list[str]] = [
        [
            "plot_code",
            "block_name",
            "risk_level",
            "plot_lon",
            "plot_lat",
            "visit_id",
            "tree_presence",
            "trees_observed",
            "trees_alive",
            "verification_outcome",
            "visitor_lon",
            "visitor_lat",
            "distance_from_plot_m",
            "inside_boundary",
            "photo_count",
            "visited_at",
            "notes",
        ]
    ]
    photo_manifest: list[dict[str, str]] = []

    for plot in plots:
        center_row = (
            await db.execute(
                select(lon_expr.label("lon"), lat_expr.label("lat")).where(
                    AuditFieldPlot.id == plot.id
                )
            )
        ).one_or_none()
        plot_lon = float(center_row.lon) if center_row and center_row.lon is not None else 0.0
        plot_lat = float(center_row.lat) if center_row and center_row.lat is not None else 0.0
        block_name = name_map.get(plot.boundary_version_id, "")

        for visit in visits_by_plot.get(plot.id, []):
            photo_keys = list(visit.photo_keys or [])
            visit_dict = {
                "visit_id": str(visit.id),
                "plot_id": str(plot.id),
                "plot_code": plot.plot_code,
                "boundary_name": block_name,
                "risk_level": plot.risk_level,
                "plot_center": {"type": "Point", "coordinates": [plot_lon, plot_lat]},
                "tree_presence": visit.tree_presence,
                "trees_observed": visit.trees_observed,
                "trees_alive": visit.trees_alive,
                "canopy_cover_pct": float(visit.canopy_cover_pct)
                if visit.canopy_cover_pct is not None
                else None,
                "verification_outcome": visit.verification_outcome,
                "visitor_lat": float(visit.visitor_lat) if visit.visitor_lat is not None else None,
                "visitor_lon": float(visit.visitor_lon) if visit.visitor_lon is not None else None,
                "distance_from_plot_m": float(visit.distance_from_plot_m)
                if visit.distance_from_plot_m is not None
                else None,
                "inside_boundary": visit.inside_boundary,
                "photo_keys": photo_keys,
                "location_warnings": list((visit.signals or {}).get("location_warnings") or []),
                "visited_at": visit.visited_at.isoformat(),
                "notes": visit.notes,
            }
            visit_rows.append(visit_dict)

            csv_rows.append(
                [
                    plot.plot_code,
                    block_name,
                    plot.risk_level,
                    f"{plot_lon:.6f}",
                    f"{plot_lat:.6f}",
                    str(visit.id),
                    visit.tree_presence or "",
                    str(visit.trees_observed or ""),
                    str(visit.trees_alive or ""),
                    visit.verification_outcome,
                    f"{float(visit.visitor_lon):.6f}" if visit.visitor_lon is not None else "",
                    f"{float(visit.visitor_lat):.6f}" if visit.visitor_lat is not None else "",
                    f"{float(visit.distance_from_plot_m):.2f}"
                    if visit.distance_from_plot_m is not None
                    else "",
                    str(visit.inside_boundary) if visit.inside_boundary is not None else "",
                    str(len(photo_keys)),
                    visit.visited_at.isoformat(),
                    (visit.notes or "").replace("\n", " "),
                ]
            )

            safe_code = _safe_filename(plot.plot_code)
            for idx, key in enumerate(photo_keys, start=1):
                ext = key.rsplit(".", 1)[-1].lower() if "." in key else "jpg"
                if ext not in {"jpg", "jpeg", "png", "webp"}:
                    ext = "jpg"
                zip_name = f"field-verification/photos/{safe_code}_{idx:02d}.{ext}"
                data = storage.get_bytes(key)
                if data:
                    files[zip_name] = data
                    photo_manifest.append({"visit_id": str(visit.id), "zip_path": zip_name, "s3_key": key})
                else:
                    photo_manifest.append(
                        {
                            "visit_id": str(visit.id),
                            "zip_path": zip_name,
                            "s3_key": key,
                            "missing": "true",
                        }
                    )

    files["field-verification/field-visits.json"] = json.dumps(
        {"visits": visit_rows, "photo_manifest": photo_manifest},
        indent=2,
        default=str,
    ).encode("utf-8")

    csv_buf = io.StringIO()
    writer = csv.writer(csv_buf)
    writer.writerows(csv_rows)
    files["field-verification/field-visits-summary.csv"] = csv_buf.getvalue().encode("utf-8")

    map_rows = []
    for plot in plots:
        latest = visits_by_plot.get(plot.id, [None])[-1] if visits_by_plot.get(plot.id) else None
        center_row = (
            await db.execute(
                select(lon_expr.label("lon"), lat_expr.label("lat")).where(
                    AuditFieldPlot.id == plot.id
                )
            )
        ).one_or_none()
        plot_lon = float(center_row.lon) if center_row and center_row.lon is not None else 0.0
        plot_lat = float(center_row.lat) if center_row and center_row.lat is not None else 0.0
        map_rows.append(
            {
                "plot_code": plot.plot_code,
                "block_name": name_map.get(plot.boundary_version_id, ""),
                "status": plot.status,
                "plot_lat": plot_lat,
                "plot_lon": plot_lon,
                "tree_presence": latest.tree_presence if latest else None,
                "verification_outcome": latest.verification_outcome if latest else None,
                "inside_boundary": latest.inside_boundary if latest else None,
                "photo_count": len(latest.photo_keys or []) if latest else 0,
            }
        )

    files["field-verification/field-verification-map.pdf"] = render_field_verification_map_pdf(
        map_rows
    )
    return files
