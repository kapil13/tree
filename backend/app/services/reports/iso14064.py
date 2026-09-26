"""ISO 14064-2 project-level GHG quantification document generation."""

from __future__ import annotations

import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit_ledger import ProjectCreditLedger
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import ENGINE_VERSION
from app.services.planting_projects.mrv_export import build_project_mrv_context

ISO14064_VERSION = "2019"
STANDARD = "ISO 14064-2"


async def build_iso14064_context(
    db: AsyncSession,
    *,
    project: PlantingProject,
) -> dict[str, Any]:
    """Build ISO 14064-2 structured context for a single planting project."""
    mrv = await build_project_mrv_context(db, project)

    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    total_carbon_kg = sum(float(t.current_carbon_kg or 0) for t in trees)
    total_co2e_kg = total_carbon_kg * 44 / 12
    gross_tco2e = total_co2e_kg / 1000.0

    uncertainty_pct = 20.0 if trees else 0.0
    co2e_lower_t = gross_tco2e * (1.0 - uncertainty_pct / 100.0 * 0.9)
    co2e_upper_t = gross_tco2e * (1.0 + uncertainty_pct / 100.0 * 0.9)

    ledger = (
        await db.execute(
            select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
        )
    ).scalar_one_or_none()

    methodology = ledger.methodology if ledger else "VERRA_VM0047"
    buffer_pct = float(ledger.buffer_pct) if ledger and ledger.buffer_pct is not None else 0.20
    net_tco2e = float(ledger.net_credits_tco2e) if ledger else gross_tco2e * (1.0 - buffer_pct)

    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    satellite_verified = sum(1 for t in trees if t.satellite_verified)

    work_areas = mrv.get("work_areas") or []
    boundary_ha = round(sum(w.get("area_ha") or 0 for w in work_areas), 4)

    return {
        "standard": STANDARD,
        "iso14064_version": ISO14064_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "project": {
            "id": str(project.id),
            "code": project.code,
            "name": project.name,
            "segment": project.segment,
            "status": project.status,
            "scheme_code": project.scheme_code,
            **mrv.get("project", {}),
        },
        "project_boundary": {
            "description": "Geospatial boundary defined by registered work areas and geotagged trees",
            "work_area_count": len(work_areas),
            "total_area_ha": boundary_ha,
            "work_areas": work_areas[:50],
            "tree_count_in_boundary": len(trees),
            "coordinate_reference": "WGS84",
        },
        "baseline_scenario": {
            "description": "Business-as-usual land use without additional planting intervention",
            "baseline_assumption": "No incremental removals beyond pre-project land cover",
            "reference_period": "Pre-planting establishment date",
            "leakage_considered": True,
        },
        "quantification_approach": {
            "methodology": methodology,
            "engine_version": ENGINE_VERSION,
            "activity_data": {
                "tree_count": len(trees),
                "species_strata": mrv.get("summary", {}).get("native_species_pct"),
                "measurement_sources": ["field_geotag", "survival_survey", "satellite_ndvi"],
            },
            "emission_reductions_removals_tco2e": {
                "gross_removals": round(gross_tco2e, 4),
                "buffer_withheld_pct": buffer_pct,
                "buffer_withheld_tco2e": round(gross_tco2e * buffer_pct, 4),
                "net_removals": round(net_tco2e, 4),
                "gas": "CO2",
            },
        },
        "uncertainty_assessment": {
            "confidence_level": "90%",
            "combined_uncertainty_pct": uncertainty_pct,
            "removals_tco2e_lower": round(co2e_lower_t, 4),
            "removals_tco2e_upper": round(co2e_upper_t, 4),
            "method": "Tier-1 default when per-tree measurement variance unavailable",
            "ledger_status": ledger.status if ledger else "estimated",
        },
        "monitoring_plan": {
            "frequency": "Quarterly field verification; monthly satellite pass",
            "parameters": [
                "Tree survival and health",
                "Geotag accuracy and recency",
                "NDVI / SAR forest integrity",
                "Compliance violations",
            ],
            "data_quality": {
                "geo_tagged_trees": geo_tagged,
                "satellite_verified_trees": satellite_verified,
                "open_violations": mrv.get("summary", {}).get("open_violations", 0),
            },
            "qa_qc": "Verifier sampling workflow with attestation records",
        },
        "mrv_summary": mrv.get("summary"),
        "scheme": mrv.get("scheme"),
        "disclaimer": (
            "This ISO 14064-2 structured export is generated from BYOT MRV data. "
            "Third-party validation may be required for registry issuance."
        ),
    }


def render_iso14064_json(ctx: dict[str, Any]) -> bytes:
    return json.dumps(ctx, indent=2, default=str).encode("utf-8")


def render_iso14064_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "ISO14064-2"
    rows: list[tuple[str, str]] = [
        ("Standard", ctx.get("standard", "")),
        ("Version", ctx.get("iso14064_version", "")),
        ("Generated", ctx.get("generated_at", "")),
        ("Project code", ctx["project"]["code"]),
        ("Project name", ctx["project"]["name"]),
        ("", ""),
        ("Project boundary", ""),
        ("Work areas", str(ctx["project_boundary"]["work_area_count"])),
        ("Area (ha)", str(ctx["project_boundary"]["total_area_ha"])),
        ("Trees in boundary", str(ctx["project_boundary"]["tree_count_in_boundary"])),
        ("", ""),
        ("Baseline", ctx["baseline_scenario"]["description"]),
        ("", ""),
        ("Quantification", ""),
        ("Methodology", ctx["quantification_approach"]["methodology"]),
        ("Gross removals (tCO2e)", str(ctx["quantification_approach"]["emission_reductions_removals_tco2e"]["gross_removals"])),
        ("Net removals (tCO2e)", str(ctx["quantification_approach"]["emission_reductions_removals_tco2e"]["net_removals"])),
        ("", ""),
        ("Uncertainty (90%)", ""),
        ("Lower bound (tCO2e)", str(ctx["uncertainty_assessment"]["removals_tco2e_lower"])),
        ("Upper bound (tCO2e)", str(ctx["uncertainty_assessment"]["removals_tco2e_upper"])),
        ("Combined uncertainty %", str(ctx["uncertainty_assessment"]["combined_uncertainty_pct"])),
        ("", ""),
        ("Monitoring frequency", ctx["monitoring_plan"]["frequency"]),
    ]
    ws.append(["Section", "Value"])
    for section, value in rows:
        ws.append([section, value])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_iso14064_zip(ctx: dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    code = ctx["project"]["code"].replace("/", "-")
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"iso14064-{code}.json", render_iso14064_json(ctx))
        zf.writestr(f"iso14064-{code}.xlsx", render_iso14064_xlsx(ctx))
    return buf.getvalue()
