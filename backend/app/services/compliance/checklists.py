"""Guided compliance eligibility checklists (Phase 5.5)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ChecklistCode = Literal[
    "verra_vm0047",
    "gold_standard_luf",
    "redd_plus",
    "ngt_campa",
    "esg_general",
]

ChecklistAnswer = Literal["yes", "no", "partial", "na"]


@dataclass(frozen=True)
class ChecklistItemDef:
    id: str
    category: str
    question: str
    guidance: str
    required: bool = True
    auto_key: str | None = None


@dataclass(frozen=True)
class ComplianceChecklist:
    code: ChecklistCode
    title: str
    short_label: str
    framework_reference: str
    description: str
    disclaimer: str
    items: tuple[ChecklistItemDef, ...]


DISCLAIMER = (
    "Self-assessment for audit preparation only. Completing a checklist does not "
    "constitute certification, eligibility determination, or legal compliance."
)

_COMMON_MONITORING = (
    ChecklistItemDef(
        id="geo_tagged_records",
        category="Monitoring",
        question="Are at least 80% of living trees geo-tagged with GPS coordinates?",
        guidance="Geo-tagged records support Verra, REDD+, and NGT evidentiary requirements.",
        auto_key="geo_tagged_majority",
    ),
    ChecklistItemDef(
        id="no_blocking_violations",
        category="Compliance",
        question="Are there no open blocking compliance violations?",
        guidance="Blocking violations must be resolved before third-party review.",
        auto_key="no_block_violations",
    ),
    ChecklistItemDef(
        id="survival_monitoring",
        category="Monitoring",
        question="Is a recurring survival / re-geotag survey cadence configured?",
        guidance="Survival monitoring demonstrates permanence and maintenance.",
        auto_key="survival_survey_configured",
    ),
)

CHECKLISTS: dict[ChecklistCode, ComplianceChecklist] = {
    "verra_vm0047": ComplianceChecklist(
        code="verra_vm0047",
        title="Verra VM0047 — ARR Eligibility",
        short_label="Verra VM0047",
        framework_reference="Verra VM0047 v1.0",
        description="Afforestation, reforestation, and revegetation eligibility and monitoring readiness.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="post_2009_planting",
                category="Eligibility",
                question="Was planting initiated on or after 31 December 2009?",
                guidance="VM0047 applies to ARR activities after the crediting start date.",
            ),
            ChecklistItemDef(
                id="non_forest_baseline",
                category="Eligibility",
                question="Can you document that project lands were non-forest for at least 10 years prior?",
                guidance="Baseline land-use evidence is required for ARR eligibility.",
            ),
            ChecklistItemDef(
                id="strata_documented",
                category="Carbon accounting",
                question="Are species and age cohort strata documented for the planting stock?",
                guidance="VM0047 monitoring uses stratified biomass or default factors.",
                auto_key="has_trees",
            ),
            ChecklistItemDef(
                id="buffer_acknowledged",
                category="Carbon accounting",
                question="Is the 20% permanence buffer pool acknowledged in project planning?",
                guidance="VM0047 withholds buffer credits for reversal risk.",
            ),
            *_COMMON_MONITORING,
            ChecklistItemDef(
                id="credit_ledger_ready",
                category="Carbon accounting",
                question="Is a project credit ledger maintained with VM0047 methodology?",
                guidance="Ledger snapshots support verification and issuance workflows.",
                auto_key="credit_ledger_synced",
            ),
        ),
    ),
    "gold_standard_luf": ComplianceChecklist(
        code="gold_standard_luf",
        title="Gold Standard LUF — Safeguards",
        short_label="Gold Standard LUF",
        framework_reference="Gold Standard Land Use & Forests Requirements",
        description="Safeguard and co-benefit readiness for Gold Standard LUF projects.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="stakeholder_consultation",
                category="Safeguards",
                question="Has stakeholder / community consultation been documented?",
                guidance="Gold Standard requires documented FPIC or equivalent engagement.",
            ),
            ChecklistItemDef(
                id="biodiversity_safeguards",
                category="Safeguards",
                question="Are biodiversity safeguards considered (native mix, invasive species control)?",
                guidance="Document species selection and habitat impact mitigation.",
                auto_key="native_species_tracked",
            ),
            ChecklistItemDef(
                id="leakage_plan",
                category="Safeguards",
                question="Is a leakage assessment or mitigation plan in place?",
                guidance="Address activity displacement outside the project boundary.",
            ),
            ChecklistItemDef(
                id="monitoring_protocol",
                category="Monitoring",
                question="Is a written monitoring protocol defined for the crediting period?",
                guidance="Include survival, biomass, and safeguard indicators.",
            ),
            *_COMMON_MONITORING,
        ),
    ),
    "redd_plus": ComplianceChecklist(
        code="redd_plus",
        title="REDD+ — Program Readiness",
        short_label="REDD+",
        framework_reference="UNFCCC REDD+ Warsaw Framework",
        description="Forest carbon MRV and safeguard readiness for REDD+ programs.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="forest_reference_level",
                category="Baseline",
                question="Is a forest reference level or deforestation baseline documented?",
                guidance="REDD+ programs require a transparent baseline or proxy.",
            ),
            ChecklistItemDef(
                id="permanence_risk",
                category="Safeguards",
                question="Are permanence and reversal risks identified with mitigation measures?",
                guidance="Include fire, pest, land-use change, and political risk.",
            ),
            ChecklistItemDef(
                id="leakage_mitigation",
                category="Safeguards",
                question="Is leakage outside the project boundary assessed and mitigated?",
                guidance="Document displacement of deforestation or degradation.",
            ),
            ChecklistItemDef(
                id="cancun_safeguards",
                category="Safeguards",
                question="Are Cancun safeguard principles acknowledged in project governance?",
                guidance="Governance, tenure, biodiversity, and participation safeguards.",
            ),
            *_COMMON_MONITORING,
            ChecklistItemDef(
                id="satellite_monitoring",
                category="Monitoring",
                question="Is remote sensing used to corroborate forest / canopy presence?",
                guidance="Satellite verification strengthens MRV defensibility.",
                auto_key="satellite_coverage",
            ),
        ),
    ),
    "ngt_campa": ComplianceChecklist(
        code="ngt_campa",
        title="NGT / CAMPA — Compensatory Afforestation",
        short_label="NGT / CAMPA",
        framework_reference="NGT orders / CAMPA guidelines",
        description="Compensatory afforestation and judicial audit readiness for Indian plantations.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="ca_records",
                category="Governance",
                question="Are compensatory afforestation / plantation records maintained per site?",
                guidance="Link plantation to CA ledger, court order, or forest clearance reference.",
            ),
            ChecklistItemDef(
                id="per_tree_proof",
                category="Monitoring",
                question="Is per-tree geo-tagged proof available for audit sampling?",
                guidance="NGT proceedings often require traceable individual tree records.",
                auto_key="geo_tagged_majority",
            ),
            ChecklistItemDef(
                id="species_mix_plan",
                category="Planting standard",
                question="Does the species mix follow the approved planting plan or standard?",
                guidance="Compare registered species against active planting standard rules.",
                auto_key="active_standard_attached",
            ),
            ChecklistItemDef(
                id="survival_compliance",
                category="Monitoring",
                question="Are survival surveys conducted on the configured cadence?",
                guidance="Re-geotag intervals demonstrate ongoing maintenance.",
                auto_key="survival_survey_configured",
            ),
            ChecklistItemDef(
                id="audit_trail_access",
                category="Governance",
                question="Is an immutable audit trail available for exports and data changes?",
                guidance="Settings → Audit trail supports third-party review.",
            ),
            ChecklistItemDef(
                id="no_blocking_violations",
                category="Compliance",
                question="Are blocking compliance violations resolved?",
                guidance="Open blocking issues should be cleared before submission.",
                auto_key="no_block_violations",
            ),
        ),
    ),
    "esg_general": ComplianceChecklist(
        code="esg_general",
        title="ESG — Disclosure Readiness",
        short_label="ESG general",
        framework_reference="Corporate ESG / TCFD-style disclosure",
        description="General ESG and climate disclosure readiness for corporate planters.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="data_governance",
                category="Governance",
                question="Is planting data governed with role-based access and audit logging?",
                guidance="Supports internal controls and external assurance.",
            ),
            ChecklistItemDef(
                id="geo_verification",
                category="Monitoring",
                question="Are planting locations independently verifiable (GPS / satellite)?",
                guidance="Geo-verification reduces greenwashing risk in disclosures.",
                auto_key="geo_tagged_majority",
            ),
            ChecklistItemDef(
                id="carbon_metrics",
                category="Carbon accounting",
                question="Are carbon estimates versioned with methodology and engine reference?",
                guidance="Disclosures should cite methodology and calculation version.",
                auto_key="credit_ledger_synced",
            ),
            ChecklistItemDef(
                id="violation_tracking",
                category="Compliance",
                question="Are compliance issues tracked and resolved with timestamps?",
                guidance="Demonstrates operational control over planting quality.",
                auto_key="no_open_violations",
            ),
            ChecklistItemDef(
                id="evidence_export",
                category="Governance",
                question="Can auditors receive a packaged evidence bundle (MRV + manifest)?",
                guidance="Use Compliance → Evidence bundle for third-party review.",
            ),
            ChecklistItemDef(
                id="work_area_boundaries",
                category="Monitoring",
                question="Are project work areas mapped with defined boundaries?",
                guidance="Boundary maps support scope definition in ESG reports.",
                auto_key="has_work_areas",
            ),
        ),
    ),
}


def get_checklist(code: str) -> ComplianceChecklist | None:
    return CHECKLISTS.get(code)  # type: ignore[arg-type]


def list_checklists() -> list[dict]:
    return [
        {
            "code": c.code,
            "title": c.title,
            "short_label": c.short_label,
            "framework_reference": c.framework_reference,
            "description": c.description,
            "disclaimer": c.disclaimer,
            "item_count": len(c.items),
        }
        for c in CHECKLISTS.values()
    ]
