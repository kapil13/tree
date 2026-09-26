"""BRSR Core KPI mapping layer (Compliance Phase A5)."""

from __future__ import annotations

from typing import Any

# Essential indicators mapped to platform metrics (Principle 6 focus).
CORE_KPI_REGISTRY: list[dict[str, str]] = [
    {
        "kpi_id": "P6.E1",
        "name": "Energy consumption and mix",
        "platform_source": "not_tracked",
        "notes": "Plantation MRV does not capture energy; link from org ERP if required.",
    },
    {
        "kpi_id": "P6.E2",
        "name": "Water withdrawal and consumption",
        "platform_source": "not_tracked",
        "notes": "Optional Jal Shakti scheme convergence may add riparian context.",
    },
    {
        "kpi_id": "P6.E3",
        "name": "Air emissions",
        "platform_source": "not_tracked",
    },
    {
        "kpi_id": "P6.E4",
        "name": "GHG emissions / land sector removals",
        "platform_source": "ghg_inventory",
    },
    {
        "kpi_id": "P6.E5",
        "name": "Waste generated and waste management",
        "platform_source": "not_tracked",
    },
    {
        "kpi_id": "P6.E6",
        "name": "Environmental compliance",
        "platform_source": "compliance_violations",
    },
    {
        "kpi_id": "P6.E7",
        "name": "Biodiversity and nature dependencies",
        "platform_source": "project_summaries",
    },
    {
        "kpi_id": "P6.E8",
        "name": "Value chain environmental impacts",
        "platform_source": "value_chain_annex",
    },
]


def build_core_kpi_sheet_rows(
    *,
    ghg_inventory: list[dict[str, Any]],
    project_summaries: list[dict[str, Any]],
    open_violations_total: int,
    value_chain_projects: list[dict[str, Any]],
    manual_kpis: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    manual = manual_kpis or {}
    for entry in CORE_KPI_REGISTRY:
        kpi_id = entry["kpi_id"]
        row: dict[str, Any] = {
            "kpi_id": kpi_id,
            "name": entry["name"],
            "platform_source": entry["platform_source"],
            "data_available": False,
            "value_summary": None,
            "notes": entry.get("notes", ""),
        }
        manual_entry = manual.get(kpi_id)
        if manual_entry and manual_entry.get("value_summary"):
            row["data_available"] = True
            row["value_summary"] = manual_entry["value_summary"]
            row["platform_source"] = manual_entry.get("source") or "manual_disclosure"
            row["notes"] = "Manual disclosure entered in BRSR wizard."
        elif kpi_id == "P6.E4" and ghg_inventory:
            row["data_available"] = True
            total = sum(float(line.get("amount_tco2e") or 0) for line in ghg_inventory)
            row["value_summary"] = f"{len(ghg_inventory)} inventory lines; {total:.2f} tCO₂e gross"
        elif kpi_id == "P6.E6":
            row["data_available"] = True
            row["value_summary"] = f"{open_violations_total} open compliance violations (portfolio)"
        elif kpi_id == "P6.E7" and project_summaries:
            row["data_available"] = True
            trees = sum(int(p.get("tree_count") or 0) for p in project_summaries)
            row["value_summary"] = f"{len(project_summaries)} projects; {trees} trees registered"
        elif kpi_id == "P6.E8" and value_chain_projects:
            with_supplier = sum(1 for p in value_chain_projects if p.get("supplier_ref"))
            row["data_available"] = with_supplier > 0
            row["value_summary"] = (
                f"{with_supplier} of {len(value_chain_projects)} projects with supplier linkage"
            )
        rows.append(row)
    return rows


def build_value_chain_annex(projects: list[Any]) -> list[dict[str, Any]]:
    """Supplier / site linkage for Scope 3 nature evidence (read-only)."""
    annex: list[dict[str, Any]] = []
    for project in projects:
        meta = getattr(project, "metadata_", None) or {}
        refs = meta.get("scheme_refs") or {}
        annex.append(
            {
                "project_code": project.code,
                "project_name": project.name,
                "scheme_code": getattr(project, "scheme_code", None),
                "segment": getattr(project, "segment", None),
                "supplier_ref": refs.get("supplier_ref") or refs.get("nccf_project_ref"),
                "state": refs.get("state_name"),
                "role": "plantation_site",
            }
        )
    return annex
