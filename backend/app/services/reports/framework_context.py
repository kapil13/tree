"""Build framework-mapped report context from planting project data."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.carbon.engine import BUFFER_POOL, ENGINE_VERSION
from app.services.planting_projects.mrv_export import build_project_mrv_context
from app.services.reports.carbon_integrity_context import build_carbon_integrity_envelope
from app.services.reports.frameworks import FrameworkProfile, get_framework_profile
from app.services.satellite.sar_service import is_sar_provider_record


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

    sar_scores: list[float] = []
    sar_ground_risk = 0
    sar_res = await db.execute(
        select(PlantationSatelliteRecord)
        .join(PlantationFence, PlantationFence.id == PlantationSatelliteRecord.fence_id)
        .where(PlantationFence.project_id == project.id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
    )
    seen_fences: set[str] = set()
    for rec in sar_res.scalars().all():
        fid = str(rec.fence_id)
        if fid in seen_fences or not is_sar_provider_record(rec.provider):
            continue
        seen_fences.add(fid)
        fusion = (rec.raw_metadata or {}).get("sar_fusion") or {}
        score = fusion.get("forest_integrity_score")
        if score is not None:
            sar_scores.append(float(score))
        if fusion.get("integrity_grade") in {"at_risk", "critical"}:
            sar_ground_risk += 1

    sar_avg_integrity = round(sum(sar_scores) / len(sar_scores), 1) if sar_scores else None

    integrity = await build_carbon_integrity_envelope(db, project)

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

    sections = _profile_sections(
        profile,
        base,
        carbon_summary,
        trees,
        monitoring={
            "satellite_verified_trees": satellite_verified,
            "sar_avg_forest_integrity": sar_avg_integrity,
            "sar_work_areas_scanned": len(sar_scores),
            "sar_ground_risk_sites": sar_ground_risk,
        },
        integrity=integrity,
    )

    return {
        **base,
        "carbon_integrity": integrity,
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
            "sar_work_areas_scanned": len(sar_scores),
            "sar_avg_forest_integrity": sar_avg_integrity,
            "sar_ground_risk_sites": sar_ground_risk,
            "sar_methodology": "NISAR-inspired L/S-band proxy with optical NDVI fusion (Phase 2)",
        },
        "sections": sections,
    }


def _profile_sections(
    profile: FrameworkProfile,
    base: dict[str, Any],
    carbon: dict[str, Any],
    trees: list[Tree],
    monitoring: dict[str, Any] | None = None,
    integrity: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    summary = base["summary"]
    project = base["project"]
    monitoring = monitoring or {}

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
                    ["Satellite monitoring", f"{monitoring.get('satellite_verified_trees', carbon.get('satellite_verified_trees', '—'))} verified"],
                    ["SAR Forest Integrity", str(monitoring.get("sar_avg_forest_integrity") or "—")],
                    ["SAR ground-risk sites", str(monitoring.get("sar_ground_risk_sites", "—"))],
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

    integrity = integrity or {}
    leakage = integrity.get("leakage") or {}
    permanence = integrity.get("permanence") or {}
    article6 = integrity.get("article6") or {}

    if profile.code == "gold_standard_luf":
        leakage_status = (
            f"{leakage.get('entry_count', 0)} entries · "
            f"{leakage.get('total_net_leakage_tco2e', 0):.4f} tCO₂e net"
            if leakage.get("entry_count")
            else "No leakage entries — add on Credits tab"
        )
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
            {
                "title": "Leakage & permanence",
                "rows": [
                    ["Leakage worksheet", leakage_status],
                    ["NPRT buffer %", str(permanence.get("buffer_pct") or "—")],
                    ["SAR forest integrity", str(permanence.get("sar_avg_forest_integrity") or "—")],
                ],
            },
        ]

    if profile.code == "redd_plus":
        leakage_status = (
            f"Documented — {leakage.get('total_net_leakage_tco2e', 0):.4f} tCO₂e net"
            if leakage.get("entry_count")
            else "Not documented — add leakage account"
        )
        permanence_status = (
            f"NPRT {permanence.get('nprt_score')} → buffer {permanence.get('buffer_pct')}%"
            if permanence.get("nprt_score") is not None
            else f"{permanence.get('open_violations', summary['open_violations'])} open violations"
        )
        return [
            {
                "title": "REDD+ MRV evidence structure",
                "rows": [
                    ["Reference level / baseline", "Requires national FREL — not computed here"],
                    ["Activity data (planting)", str(summary["tree_count"])],
                    ["Permanence risk", permanence_status],
                    ["Leakage assessment", leakage_status],
                    ["SAR ground-risk sites", str(permanence.get("sar_ground_risk_sites", "—"))],
                ],
            },
            {"title": "Carbon stock estimate", "rows": common_carbon},
        ]

    if profile.code == "paris_ndc":
        art6_rows: list[list[str]] = [
            ["Authorization ref", str(article6.get("authorization_ref") or "—")],
            ["Article 6 serials", str(article6.get("article6_serial_count", 0))],
            ["Retired with CA ref", str(article6.get("retired_article6_count", 0))],
        ]
        for ref in (article6.get("corresponding_adjustment_refs") or [])[:5]:
            art6_rows.append(["Corresponding adjustment", str(ref)])
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
                    ["Leakage deducted (tCO₂e)", f"{leakage.get('total_net_leakage_tco2e', 0):.4f}"],
                ],
            },
            {
                "title": "Article 6 traceability (informational)",
                "rows": art6_rows,
            },
        ]

    if profile.code == "ngt_campa":
        survival = summary.get("survival_counts") or {}
        scheme_refs = (base.get("scheme") or {}).get("refs") or {}
        return [
            {
                "title": "Compensatory afforestation register",
                "rows": [
                    ["Project", f"{project['name']} ({project['code']})"],
                    ["PCA / CA number", str(scheme_refs.get("pca_number") or "—")],
                    ["Forest diversion ref", str(scheme_refs.get("forest_diversion_id") or "—")],
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

    if profile.code == "gim":
        scheme_refs = (base.get("scheme") or {}).get("refs") or {}
        return [
            {
                "title": "Green India Mission indicators",
                "rows": [
                    ["Sub-mission", str(scheme_refs.get("gim_sub_mission") or "—")],
                    ["State annual plan ref", str(scheme_refs.get("state_annual_plan_ref") or "—")],
                    ["APO financial year", str(scheme_refs.get("apo_financial_year") or "—")],
                    ["Trees registered", str(summary["tree_count"])],
                    ["Native species %", str(summary.get("native_species_pct") or "—")],
                ],
            },
            {"title": "Carbon summary", "rows": common_carbon},
        ]

    if profile.code == "mishti":
        scheme_refs = (base.get("scheme") or {}).get("refs") or {}
        return [
            {
                "title": "MISHTI coastal restoration",
                "rows": [
                    ["MISHTI project ID", str(scheme_refs.get("mishti_project_id") or "—")],
                    ["Coastal state", str(scheme_refs.get("coastal_state") or "—")],
                    ["CRZ category", str(scheme_refs.get("crz_category") or "—")],
                    ["Restoration area (ha)", str(scheme_refs.get("restoration_area_ha") or "—")],
                    ["Trees registered", str(summary["tree_count"])],
                ],
            },
            {"title": "Survival & monitoring", "rows": common_carbon},
        ]

    if profile.code == "nagar_van":
        scheme_refs = (base.get("scheme") or {}).get("refs") or {}
        return [
            {
                "title": "Nagar Van urban forest",
                "rows": [
                    ["Nagar Van project ID", str(scheme_refs.get("nagar_van_project_id") or "—")],
                    ["ULB / municipal body", str(scheme_refs.get("ulb_name") or "—")],
                    ["Urban forest name", str(scheme_refs.get("urban_forest_name") or "—")],
                    ["Scheme target trees", str(scheme_refs.get("target_trees") or "—")],
                    ["Trees registered", str(summary["tree_count"])],
                ],
            },
            {"title": "Compliance", "rows": [["Open violations", str(summary["open_violations"])]]},
        ]

    if profile.code == "green_credit_india":
        scheme_refs = (base.get("scheme") or {}).get("refs") or {}
        return [
            {
                "title": "Green Credit Programme",
                "rows": [
                    ["Land bank ID", str(scheme_refs.get("green_credit_land_bank_id") or "—")],
                    ["Activity type", str(scheme_refs.get("gcp_activity_type") or "—")],
                    ["Verifier reference", str(scheme_refs.get("verifier_reference") or "—")],
                    ["Trees registered", str(summary["tree_count"])],
                ],
            },
            {"title": "Carbon estimate", "rows": common_carbon},
        ]

    if profile.code == "sahakar_van":
        scheme_refs = (base.get("scheme") or {}).get("refs") or {}
        return [
            {
                "title": "Sahakar Van cooperative forest",
                "rows": [
                    ["Sahakar Van project ID", str(scheme_refs.get("sahakar_van_project_id") or "—")],
                    ["NCCF reference", str(scheme_refs.get("nccf_project_ref") or "—")],
                    ["Amul union", str(scheme_refs.get("amul_union_name") or "—")],
                    ["Cooperative society", str(scheme_refs.get("cooperative_society_name") or "—")],
                    ["Village / site", str(scheme_refs.get("village_name") or "—")],
                    ["District", str(scheme_refs.get("district") or "—")],
                    ["State", str(scheme_refs.get("state_name") or "—")],
                    ["Site area (acres)", str(scheme_refs.get("site_area_acres") or "—")],
                    ["Plantation method", str(scheme_refs.get("plantation_method") or "—")],
                    ["Target trees", str(scheme_refs.get("target_trees") or "—")],
                    ["Trees registered", str(summary["tree_count"])],
                    ["Native species %", str(summary.get("native_species_pct") or "—")],
                ],
            },
            {"title": "Compliance", "rows": [["Open violations", str(summary["open_violations"])]]},
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
