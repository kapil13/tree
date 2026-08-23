"""EU Deforestation Regulation (EUDR) supplier geo due diligence (Phase E — E4)."""

from __future__ import annotations

import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from geoalchemy2.shape import to_shape
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.compliance.safeguards import list_safeguard_documents
from app.services.planting_projects.mrv_export import build_project_mrv_context
from app.services.reports.brsr_kpi_map import build_value_chain_annex

DISCLAIMER = (
    "Geo-coordinate due diligence pack for corporate buyers proving plantation legality. "
    "Not EU EUDR conformity assessment or customs clearance."
)


def _polygon_centroid(geom: Any) -> dict[str, float] | None:
    if geom is None:
        return None
    try:
        shape = to_shape(geom)
        return {"lat": round(shape.centroid.y, 6), "lon": round(shape.centroid.x, 6)}
    except Exception:
        return None


async def build_eudr_due_diligence_context(
    db: AsyncSession,
    project: PlantingProject,
) -> dict[str, Any]:
    mrv = await build_project_mrv_context(db, project)
    summary = mrv.get("summary") or {}

    trees = list(
        (
            await db.execute(
                select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
            )
        ).scalars().all()
    )
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    geo_pct = round(100.0 * geo_tagged / len(trees), 1) if trees else 0.0

    fences = list(
        (
            await db.execute(
                select(PlantationFence)
                .where(PlantationFence.project_id == project.id)
                .order_by(PlantationFence.name.asc())
            )
        ).scalars().all()
    )

    site_rows: list[dict[str, Any]] = []
    for fence in fences:
        site_rows.append(
            {
                "site_name": fence.name,
                "fence_id": str(fence.id),
                "area_ha": float(fence.area_ha) if fence.area_ha else None,
                "centroid": _polygon_centroid(fence.boundary),
                "coordinate_reference": "WGS84",
            }
        )

    sample_coords: list[dict[str, Any]] = []
    for tree in trees[:500]:
        if tree.latitude is None or tree.longitude is None:
            continue
        sample_coords.append(
            {
                "tree_code": tree.public_code,
                "lat": float(tree.latitude),
                "lon": float(tree.longitude),
                "species": tree.species_text,
                "planted_at": tree.planted_at.date().isoformat() if tree.planted_at else None,
            }
        )

    meta = getattr(project, "metadata_", None) or {}
    refs = meta.get("scheme_refs") or {}
    safeguards = await list_safeguard_documents(db, project.id)
    value_chain = build_value_chain_annex([project])

    return {
        "export_type": "eudr_supplier_mrv",
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
        "project": {
            "code": project.code,
            "name": project.name,
            "scheme_code": project.scheme_code,
            "segment": project.segment,
            "state": refs.get("state_name"),
        },
        "supplier": {
            "supplier_ref": refs.get("supplier_ref") or refs.get("nccf_project_ref"),
            "role": "plantation_site",
            "brsr_value_chain_link": value_chain[0] if value_chain else None,
        },
        "geo_due_diligence": {
            "tree_count": len(trees),
            "geo_tagged_count": geo_tagged,
            "geo_tagged_pct": geo_pct,
            "work_area_count": len(fences),
            "total_area_ha": round(sum(float(f.area_ha or 0) for f in fences), 4),
            "coordinate_reference": "WGS84",
            "sites": site_rows,
            "sample_tree_coordinates": sample_coords,
            "sample_limit": 500,
        },
        "legality_evidence": {
            "safeguard_document_count": len(safeguards),
            "safeguard_types": sorted({d.doc_type for d in safeguards}),
            "open_violations": summary.get("open_violations", 0),
            "native_species_pct": summary.get("native_species_pct"),
        },
        "brsr_annex": value_chain,
    }


def render_eudr_due_diligence_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "EUDR due diligence"
    project = ctx.get("project") or {}
    supplier = ctx.get("supplier") or {}
    geo = ctx.get("geo_due_diligence") or {}
    legal = ctx.get("legality_evidence") or {}

    ws.append(["EUDR supplier geo due diligence pack"])
    ws.append(["Disclaimer", ctx.get("disclaimer", "")])
    ws.append(["Generated", ctx.get("generated_at", "")])
    ws.append([])
    ws.append(["Project code", project.get("code", "")])
    ws.append(["Project name", project.get("name", "")])
    ws.append(["Supplier ref", supplier.get("supplier_ref", "")])
    ws.append(["State", project.get("state", "")])
    ws.append([])
    ws.append(["Geo-tagged trees (%)", geo.get("geo_tagged_pct", 0)])
    ws.append(["Total area (ha)", geo.get("total_area_ha", 0)])
    ws.append(["Work areas", geo.get("work_area_count", 0)])
    ws.append(["Safeguard documents", legal.get("safeguard_document_count", 0)])
    ws.append(["Open violations", legal.get("open_violations", 0)])
    ws.append([])
    ws.append(["Site", "Area (ha)", "Centroid lat", "Centroid lon"])
    for site in geo.get("sites") or []:
        centroid = site.get("centroid") or {}
        ws.append(
            [
                site.get("site_name", ""),
                site.get("area_ha", ""),
                centroid.get("lat", ""),
                centroid.get("lon", ""),
            ]
        )
    ws.append([])
    ws.append(["Tree code", "Lat", "Lon", "Species", "Planted"])
    for coord in geo.get("sample_tree_coordinates") or []:
        ws.append(
            [
                coord.get("tree_code", ""),
                coord.get("lat", ""),
                coord.get("lon", ""),
                coord.get("species", ""),
                coord.get("planted_at", ""),
            ]
        )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_eudr_due_diligence_zip(ctx: dict[str, Any]) -> bytes:
    code = (ctx.get("project") or {}).get("code", "project").replace("/", "-")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"eudr-{code}.json", json.dumps(ctx, indent=2, default=str).encode("utf-8"))
        zf.writestr(f"eudr-{code}.xlsx", render_eudr_due_diligence_xlsx(ctx))
    return buf.getvalue()
