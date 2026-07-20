"""Build framework-mapped report context from planting project data."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import BUFFER_POOL, ENGINE_VERSION
from app.services.planting_projects.mrv_export import build_project_mrv_context
from app.services.reports.frameworks import FrameworkProfile, get_framework_profile


def _methodology_buffer(methodology: str) -> float:
    return BUFFER_POOL.get(methodology, 0.0)


async def build_framework_report_context(
    db: AsyncSession,
    project: PlantingProject,
    profile_code: str,
) -> dict[str, Any]:
    profile = get_framework_profile(profile_code)
    if profile is None:
        raise ValueError("unknown_framework_profile")

    base = await build_project_mrv_context(db, project)
    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())

    total_carbon_kg = sum(float(t.current_carbon_kg or 0) for t in trees)
    total_co2e_kg = total_carbon_kg * 44 / 12
    gross_credits_tco2e = total_co2e_kg / 1000.0
    buffer_pct = _methodology_buffer(profile.methodology) if profile.methodology != "NONE" else 0.0
    net_credits_tco2e = gross_credits_tco2e * (1.0 - buffer_pct)

    species_counts = Counter(t.species_text or "Unknown" for t in trees)
    strata = [
        {"species": species, "tree_count": count}
        for species, count in species_counts.most_common(20)
    ]

    satellite_verified = sum(1 for t in trees if t.satellite_verified)
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)

    carbon_summary = {
        "total_trees": len(trees),
        "total_carbon_kg": round(total_carbon_kg, 3),
        "total_co2e_kg": round(total_co2e_kg, 3),
        "gross_credits_tco2e": round(gross_credits_tco2e, 4),
        "buffer_pct": buffer_pct,
        "buffer_withheld_tco2e": round(gross_credits_tco2e * buffer_pct, 4),
        "net_credits_tco2e": round(net_credits_tco2e, 4),
        "engine_version": ENGINE_VERSION,
        "methodology": profile.methodology,
    }

    sections = _profile_sections(profile, base, carbon_summary, trees)

    return {
        **base,
        "framework": {
            "code": profile.code,
            "title": profile.title,
            "short_label": profile.short_label,
            "methodology": profile.methodology,
            "reference": profile.reference,
            "disclaimer": profile.disclaimer,
            "generated_at": datetime.now(UTC).isoformat(),
        },
        "carbon_summary": carbon_summary,
        "strata": strata,
        "monitoring": {
            "satellite_verified_trees": satellite_verified,
            "geo_tagged_trees": geo_tagged,
            "open_violations": base["summary"].get("open_violations", 0),
            "native_species_pct": base["summary"].get("native_species_pct"),
        },
        "sections": sections,
    }


def _profile_sections(
    profile: FrameworkProfile,
    base: dict[str, Any],
    carbon: dict[str, Any],
    trees: list[Tree],
) -> list[dict[str, Any]]:
    summary = base["summary"]
    project = base["project"]

    common_carbon = [
        ["Total trees", str(carbon["total_trees"])],
        ["Total carbon (kg C)", f"{carbon['total_carbon_kg']:,.2f}"],
        ["Total CO₂e (kg)", f"{carbon['total_co2e_kg']:,.2f}"],
        ["Engine version", carbon["engine_version"]],
    ]

    if profile.code == "ipcc_ar6":
        return [
            {
                "title": "IPCC AR6 carbon summary",
                "rows": [
                    *common_carbon,
                    ["Methodology", "IPCC AR6 Tier 1/2 allometric defaults"],
                    ["Biomass expansion", "Species allometric + IPCC root-shoot"],
                ],
            },
            {
                "title": "Data lineage",
                "rows": [
                    ["Field registration", f"{summary['tree_count']} geo-tagged trees"],
                    ["Satellite monitoring", f"{carbon.get('satellite_verified_trees', '—')} verified"],
                    ["Compliance mode", project.get("compliance_mode", "—")],
                ],
            },
        ]

    if profile.code == "verra_vm0047":
        return [
            {
                "title": "VM0047 eligibility indicators",
                "rows": [
                    ["Project type", "Afforestation / Reforestation / Revegetation (ARR)"],
                    ["Planting records", str(summary["tree_count"])],
                    ["Open compliance issues", str(summary["open_violations"])],
                    ["Native species %", str(summary.get("native_species_pct") or "—")],
                ],
            },
            {
                "title": "Carbon & buffer pool (VM0047 20%)",
                "rows": [
                    *common_carbon,
                    ["Gross credits (tCO₂e)", f"{carbon['gross_credits_tco2e']:.4f}"],
                    ["Buffer withheld (20%)", f"{carbon['buffer_withheld_tco2e']:.4f}"],
                    ["Net issuable estimate (tCO₂e)", f"{carbon['net_credits_tco2e']:.4f}"],
                ],
            },
            {
                "title": "Stratification (species cohorts)",
                "rows": _strata_from_trees(trees) or [["—", "No trees"]],
            },
        ]

    if profile.code == "gold_standard_luf":
        return [
            {
                "title": "Carbon summary",
                "rows": [
                    *common_carbon,
                    ["Buffer (15%)", f"{carbon['buffer_withheld_tco2e']:.4f} tCO₂e"],
                    ["Net credits estimate", f"{carbon['net_credits_tco2e']:.4f} tCO₂e"],
                ],
            },
            {
                "title": "Co-benefit indicators",
                "rows": [
                    ["Biodiversity (native %)", str(summary.get("native_species_pct") or "—")],
                    ["Community / field evidence", f"{summary['tree_count']} registered trees"],
                    ["Compliance violations (open)", str(summary["open_violations"])],
                ],
            },
        ]

    if profile.code == "redd_plus":
        return [
            {
                "title": "REDD+ MRV evidence structure",
                "rows": [
                    ["Reference level / baseline", "Requires national FREL — not computed here"],
                    ["Activity data (planting)", str(summary["tree_count"])],
                    ["Permanence risk flags", f"{summary['open_violations']} open violations"],
                    ["Leakage assessment", "Manual questionnaire required"],
                ],
            },
            {"title": "Carbon stock estimate", "rows": common_carbon},
        ]

    if profile.code == "paris_ndc":
        return [
            {
                "title": "NDC activity ledger",
                "rows": [
                    ["Project code", project["code"]],
                    ["Trees with GPS proof", str(summary["tree_count"])],
                    ["Segment", project.get("segment", "—")],
                    ["Reporting period", datetime.now(UTC).strftime("%Y")],
                ],
            },
            {
                "title": "GHG estimate (supporting NDC reporting)",
                "rows": [
                    *common_carbon,
                    ["Estimated removals (tCO₂e)", f"{carbon['gross_credits_tco2e']:.4f}"],
                ],
            },
        ]

    if profile.code == "ngt_campa":
        survival = summary.get("survival_counts") or {}
        return [
            {
                "title": "Compensatory afforestation register",
                "rows": [
                    ["Project", f"{project['name']} ({project['code']})"],
                    ["Trees planted (registered)", str(summary["tree_count"])],
                    ["Work areas", str(summary["work_area_count"])],
                    ["Open violations", str(summary["open_violations"])],
                ],
            },
            {
                "title": "Geo-tagged evidence",
                "rows": [
                    ["Trees with last geotag", str(len([t for t in trees if t.last_geotag_at]))],
                    ["Satellite-verified", str(len([t for t in trees if t.satellite_verified]))],
                ],
            },
            {
                "title": "Survival status",
                "rows": [[k, str(v)] for k, v in sorted(survival.items())] or [["—", "No surveys"]],
            },
        ]

    # esg_general
    return [
        {
            "title": "ESG planting & carbon",
            "rows": [
                *common_carbon,
                ["Work areas monitored", str(summary["work_area_count"])],
                ["Native species %", str(summary.get("native_species_pct") or "—")],
            ],
        },
        {
            "title": "Governance & compliance",
            "rows": [
                ["Compliance mode", project.get("compliance_mode", "—")],
                ["Open violations", str(summary["open_violations"])],
                ["Resolved violations", str(summary["resolved_violations"])],
            ],
        },
    ]


def _strata_from_trees(trees: list[Tree]) -> list[list[str]]:
    counts = Counter(t.species_text or "Unknown" for t in trees)
    return [[species, str(count)] for species, count in counts.most_common(15)]
