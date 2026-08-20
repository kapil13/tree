"""GHG Protocol Land Sector (2024) removals reporting for corporate inventories."""

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
from app.models.organization import Organization
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import ENGINE_VERSION
from app.services.planting_projects.mrv_export import build_project_mrv_context

GHG_PROTOCOL_VERSION = "Land Sector Removals and Storage Guidance (2024)"
STANDARD = "GHG Protocol Land Sector"


async def _project_inventory_lines(
    db: AsyncSession,
    project: PlantingProject,
) -> list[dict[str, Any]]:
    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    total_carbon_kg = sum(float(t.current_carbon_kg or 0) for t in trees)
    total_co2e_kg = total_carbon_kg * 44 / 12
    gross_t = total_co2e_kg / 1000.0

    uncertainty_pct = 20.0 if trees else 0.0
    lower_t = gross_t * (1.0 - uncertainty_pct / 100.0 * 0.9)
    upper_t = gross_t * (1.0 + uncertainty_pct / 100.0 * 0.9)

    ledger = (
        await db.execute(
            select(ProjectCreditLedger).where(ProjectCreditLedger.project_id == project.id)
        )
    ).scalar_one_or_none()

    buffer_pct = float(ledger.buffer_pct) if ledger and ledger.buffer_pct is not None else 0.20
    net_t = float(ledger.net_credits_tco2e) if ledger else gross_t * (1.0 - buffer_pct)

    return [
        {
            "line_id": f"{project.code}-LSR-GROSS",
            "project_code": project.code,
            "activity": "Land sector CO₂ removals — gross sequestration",
            "scope": "Scope 1",
            "scope_tag": "Direct land sector removal",
            "ghg_protocol_category": "Land Sector Removals — biological CO₂ uptake",
            "land_sector_subcategory": "Afforestation / reforestation",
            "gas": "CO2",
            "amount_tco2e": round(gross_t, 4),
            "uncertainty_pct": uncertainty_pct,
            "co2e_lower_90_t": round(lower_t, 4),
            "co2e_upper_90_t": round(upper_t, 4),
            "reporting_boundary": "Operational control",
            "methodology": ledger.methodology if ledger else "VERRA_VM0047",
            "engine_version": ENGINE_VERSION,
            "tree_count": len(trees),
        },
        {
            "line_id": f"{project.code}-LSR-NET",
            "project_code": project.code,
            "activity": "Net issuable removals after buffer pool",
            "scope": "Scope 1",
            "scope_tag": "Direct land sector removal (net)",
            "ghg_protocol_category": "Land Sector Removals — net of buffer",
            "land_sector_subcategory": "Afforestation / reforestation",
            "gas": "CO2",
            "amount_tco2e": round(net_t, 4),
            "uncertainty_pct": uncertainty_pct,
            "co2e_lower_90_t": round(lower_t * (1.0 - buffer_pct), 4),
            "co2e_upper_90_t": round(upper_t * (1.0 - buffer_pct), 4),
            "buffer_pct": buffer_pct,
            "ledger_status": ledger.status if ledger else "estimated",
        },
    ]


async def build_ghg_protocol_context(
    db: AsyncSession,
    *,
    organization: Organization,
    project_id: Any | None = None,
) -> dict[str, Any]:
    stmt = select(PlantingProject).where(PlantingProject.organization_id == organization.id)
    if project_id is not None:
        stmt = stmt.where(PlantingProject.id == project_id)
    projects = list((await db.execute(stmt.order_by(PlantingProject.code.asc()))).scalars().all())

    inventory: list[dict[str, Any]] = []
    project_summaries: list[dict[str, Any]] = []
    for project in projects:
        lines = await _project_inventory_lines(db, project)
        inventory.extend(lines)
        mrv = await build_project_mrv_context(db, project)
        project_summaries.append(
            {
                "code": project.code,
                "name": project.name,
                "tree_count": mrv.get("summary", {}).get("tree_count", 0),
                "work_area_count": mrv.get("summary", {}).get("work_area_count", 0),
            }
        )

    total_gross = sum(line["amount_tco2e"] for line in inventory if "GROSS" in line["line_id"])
    total_net = sum(line["amount_tco2e"] for line in inventory if "NET" in line["line_id"])

    return {
        "standard": STANDARD,
        "ghg_protocol_version": GHG_PROTOCOL_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "organization": {
            "id": str(organization.id),
            "name": organization.name,
            "slug": organization.slug,
        },
        "scope": "single_project" if project_id else "organization_portfolio",
        "reporting_boundary": "Operational control — planting projects under organization",
        "inventory_lines": inventory,
        "portfolio_summary": {
            "project_count": len(projects),
            "total_gross_removals_tco2e": round(total_gross, 4),
            "total_net_removals_tco2e": round(total_net, 4),
            "projects": project_summaries,
        },
        "corporate_inventory_notes": (
            "Land sector removals reported separately from Scope 1/2/3 fossil emissions. "
            "Aligns with GHG Protocol Land Sector Guidance (2024) for biological CO₂ uptake."
        ),
    }


def render_ghg_protocol_json(ctx: dict[str, Any]) -> bytes:
    return json.dumps(ctx, indent=2, default=str).encode("utf-8")


def render_ghg_protocol_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "GHG Land Sector"
    ws.append(
        [
            "line_id",
            "project_code",
            "scope",
            "ghg_protocol_category",
            "land_sector_subcategory",
            "gas",
            "amount_tco2e",
            "uncertainty_pct",
            "co2e_lower_90_t",
            "co2e_upper_90_t",
        ]
    )
    for line in ctx.get("inventory_lines", []):
        ws.append(
            [
                line.get("line_id"),
                line.get("project_code"),
                line.get("scope"),
                line.get("ghg_protocol_category"),
                line.get("land_sector_subcategory"),
                line.get("gas"),
                line.get("amount_tco2e"),
                line.get("uncertainty_pct"),
                line.get("co2e_lower_90_t"),
                line.get("co2e_upper_90_t"),
            ]
        )
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_ghg_protocol_zip(ctx: dict[str, Any]) -> bytes:
    slug = (ctx.get("organization", {}).get("slug") or "org").replace("/", "-")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"ghg-land-sector-{slug}.json", render_ghg_protocol_json(ctx))
        zf.writestr(f"ghg-land-sector-{slug}.xlsx", render_ghg_protocol_xlsx(ctx))
    return buf.getvalue()
