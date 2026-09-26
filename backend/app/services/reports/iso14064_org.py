"""ISO 14064-1 organizational GHG inventory export (Phase E — E5)."""

from __future__ import annotations

import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.services.carbon.ghg_protocol import build_ghg_protocol_context

DISCLAIMER = (
    "Organizational GHG inventory structured for ISO 14064-1 preparation. "
    "Complements ISO 14064-2 project-level reports. Not third-party verification."
)

STANDARD = "ISO 14064-1"
ISO14064_1_VERSION = "2018"


async def build_iso14064_org_context(
    db: AsyncSession,
    *,
    organization: Organization,
) -> dict[str, Any]:
    ghg = await build_ghg_protocol_context(db, organization=organization)
    inventory = ghg.get("inventory_lines") or []
    portfolio = ghg.get("portfolio_summary") or {}

    org_inventory_lines: list[dict[str, Any]] = [
        {
            "line_id": "ORG-SCOPE1-PLACEHOLDER",
            "scope": "Scope 1",
            "category": "Direct fossil emissions",
            "gas": "CO2e",
            "amount_tco2e": None,
            "notes": "Link from org ERP — plantation MRV tracks land removals only",
            "data_available": False,
        },
        {
            "line_id": "ORG-SCOPE2-PLACEHOLDER",
            "scope": "Scope 2",
            "category": "Purchased electricity",
            "gas": "CO2e",
            "amount_tco2e": None,
            "notes": "Link from org utility bills",
            "data_available": False,
        },
    ]

    for line in inventory:
        if "GROSS" in line.get("line_id", ""):
            org_inventory_lines.append(
                {
                    "line_id": line["line_id"],
                    "scope": "Land sector (FLAG)",
                    "category": line.get("ghg_protocol_category"),
                    "gas": line.get("gas", "CO2"),
                    "amount_tco2e": line.get("amount_tco2e"),
                    "project_code": line.get("project_code"),
                    "uncertainty_pct": line.get("uncertainty_pct"),
                    "data_available": True,
                    "notes": "From plantation removals — aligns with ISO 14064-2 project quantification",
                }
            )

    return {
        "standard": STANDARD,
        "iso14064_version": ISO14064_1_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "disclaimer": DISCLAIMER,
        "organization": ghg.get("organization"),
        "reporting_boundary": ghg.get("reporting_boundary"),
        "inventory_lines": org_inventory_lines,
        "portfolio_summary": portfolio,
        "complements": "ISO 14064-2 project reports per planting project",
        "linked_exports": ["ghg_protocol", "iso14064-2", "sbti_flag"],
    }


def render_iso14064_org_json(ctx: dict[str, Any]) -> bytes:
    return json.dumps(ctx, indent=2, default=str).encode("utf-8")


def render_iso14064_org_xlsx(ctx: dict[str, Any]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "ISO 14064-1 org"
    ws.append(["ISO 14064-1 organizational inventory"])
    ws.append(["Disclaimer", ctx.get("disclaimer", "")])
    ws.append(["Generated", ctx.get("generated_at", "")])
    org = ctx.get("organization") or {}
    ws.append(["Organization", org.get("name", "")])
    ws.append([])
    ws.append(["line_id", "scope", "category", "gas", "amount_tco2e", "project_code", "notes"])
    for line in ctx.get("inventory_lines") or []:
        ws.append(
            [
                line.get("line_id"),
                line.get("scope"),
                line.get("category"),
                line.get("gas"),
                line.get("amount_tco2e"),
                line.get("project_code"),
                line.get("notes"),
            ]
        )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_iso14064_org_zip(ctx: dict[str, Any]) -> bytes:
    slug = (ctx.get("organization") or {}).get("slug") or "org"
    slug = slug.replace("/", "-")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"iso14064-org-{slug}.json", render_iso14064_org_json(ctx))
        zf.writestr(f"iso14064-org-{slug}.xlsx", render_iso14064_org_xlsx(ctx))
    return buf.getvalue()
