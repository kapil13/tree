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
    "gim_general",
    "mishti_coastal",
    "mgnrega_convergence",
    "nagar_van_urban",
    "green_credit_india",
    "sahakar_van_coop",
    "icvcm_ccp",
    "fra_tenure",
    "article6_readiness",
    "world_bank_esf",
    "undp_ses",
    "sbti_flag",
    "eudr_supplier_mrv",
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
            ChecklistItemDef(
                id="nba_species_review",
                category="Safeguards",
                question="Are exotic, medicinal, or scheduled species flagged with NBA acknowledgment where required?",
                guidance="Biological Diversity Act benefit-sharing may apply to certain species.",
                auto_key="nba_species_reviewed",
                required=False,
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
                auto_key="leakage_documented",
            ),
            ChecklistItemDef(
                id="monitoring_protocol",
                category="Monitoring",
                question="Is a written monitoring protocol defined for the crediting period?",
                guidance="Include survival, biomass, and safeguard indicators.",
            ),
            *_COMMON_MONITORING,
            ChecklistItemDef(
                id="nba_species_review",
                category="Safeguards",
                question="Are exotic, medicinal, or scheduled species flagged with NBA acknowledgment where required?",
                guidance="Biological Diversity Act benefit-sharing may apply to certain species.",
                auto_key="nba_species_reviewed",
                required=False,
            ),
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
                auto_key="sar_permanence_risk",
            ),
            ChecklistItemDef(
                id="leakage_mitigation",
                category="Safeguards",
                question="Is leakage outside the project boundary assessed and mitigated?",
                guidance="Document displacement of deforestation or degradation.",
                auto_key="leakage_documented",
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
    "gim_general": ComplianceChecklist(
        code="gim_general",
        title="Green India Mission — Readiness",
        short_label="GIM",
        framework_reference="National Mission for a Green India (NAPCC)",
        description="Eco-restoration and afforestation readiness under Green India Mission.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="state_plan_ref",
                category="Governance",
                question="Is the state annual plan / sub-mission reference documented?",
                guidance="Link project to SM-1 through SM-4 sub-mission and state annual plan.",
            ),
            ChecklistItemDef(
                id="jfmc_engagement",
                category="Safeguards",
                question="Is JFMC or village committee engagement documented where applicable?",
                guidance="Community participation is required for degraded forest restoration blocks.",
            ),
            ChecklistItemDef(
                id="species_mix_plan",
                category="Planting standard",
                question="Does the species mix follow the approved GIM planting plan?",
                guidance="Compare registered species against active planting standard rules.",
                auto_key="active_standard_attached",
            ),
            *_COMMON_MONITORING,
        ),
    ),
    "mishti_coastal": ComplianceChecklist(
        code="mishti_coastal",
        title="MISHTI — Coastal Mangrove Readiness",
        short_label="MISHTI",
        framework_reference="MISHTI — MoEFCC coastal restoration",
        description="Mangrove shoreline restoration compliance for MISHTI-funded projects.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="crz_clearance",
                category="Governance",
                question="Is CRZ category and coastal regulatory clearance documented?",
                guidance="Record CRZ-I through CRZ-IV classification and approvals.",
            ),
            ChecklistItemDef(
                id="restoration_area",
                category="Monitoring",
                question="Is restoration area (hectares) recorded and mapped?",
                guidance="Work area polygons should cover the declared restoration extent.",
                auto_key="has_work_areas",
            ),
            ChecklistItemDef(
                id="coastal_survival",
                category="Monitoring",
                question="Are survival surveys conducted on the configured cadence?",
                guidance="Mangrove survival monitoring demonstrates shoreline permanence.",
                auto_key="survival_survey_configured",
            ),
            ChecklistItemDef(
                id="per_tree_proof",
                category="Monitoring",
                question="Is per-tree geo-tagged proof available for audit sampling?",
                guidance="Coastal audits require traceable individual planting records.",
                auto_key="geo_tagged_majority",
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
    "mgnrega_convergence": ComplianceChecklist(
        code="mgnrega_convergence",
        title="MGNREGA — Convergence Readiness",
        short_label="MGNREGA",
        framework_reference="MGNREGA wage-employment convergence guidelines",
        description="Farm forestry convergence with MGNREGA person-day employment records.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="work_estimate_id",
                category="Governance",
                question="Is the MGNREGA work estimate ID linked to this plantation?",
                guidance="Convergence projects must cite the approved work estimate.",
            ),
            ChecklistItemDef(
                id="gram_panchayat",
                category="Governance",
                question="Is gram panchayat jurisdiction documented?",
                guidance="Record panchayat name for wage employment audit trails.",
            ),
            ChecklistItemDef(
                id="person_days",
                category="Monitoring",
                question="Are planned person-days recorded against planting progress?",
                guidance="Track wage employment against registered tree counts.",
            ),
            *_COMMON_MONITORING,
        ),
    ),
    "nagar_van_urban": ComplianceChecklist(
        code="nagar_van_urban",
        title="Nagar Van — Urban Forest Readiness",
        short_label="Nagar Van",
        framework_reference="Nagar Van Yojana — MoEFCC",
        description="Urban forestry compliance for Nagar Van Yojana city-forest blocks.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="ulb_partnership",
                category="Governance",
                question="Is ULB / municipal body partnership documented?",
                guidance="Record urban local body name and Nagar Van project ID.",
            ),
            ChecklistItemDef(
                id="target_trees",
                category="Monitoring",
                question="Is progress tracked against the scheme tree target (10,000+)?",
                guidance="Nagar Van sites typically target large-scale urban planting.",
                auto_key="has_trees",
            ),
            ChecklistItemDef(
                id="geo_tagged_records",
                category="Monitoring",
                question="Are at least 80% of living trees geo-tagged with GPS coordinates?",
                guidance="Urban forest audits require verifiable planting locations.",
                auto_key="geo_tagged_majority",
            ),
            ChecklistItemDef(
                id="no_blocking_violations",
                category="Compliance",
                question="Are blocking compliance violations resolved?",
                guidance="Open blocking issues should be cleared before ULB submission.",
                auto_key="no_block_violations",
            ),
        ),
    ),
    "green_credit_india": ComplianceChecklist(
        code="green_credit_india",
        title="Green Credit Programme — Readiness",
        short_label="Green Credit",
        framework_reference="MoEFCC Green Credit Rules 2023",
        description="Land bank registration and verifier readiness for India's Green Credit Programme.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="land_bank_registration",
                category="Governance",
                question="Is the Green Credit land bank ID registered and linked?",
                guidance="MoEFCC GCP requires land bank registration before credit issuance.",
                auto_key="land_bank_registered",
            ),
            ChecklistItemDef(
                id="activity_type",
                category="Eligibility",
                question="Is the GCP activity type (plantation / eco-restoration) documented?",
                guidance="Activity type determines credit category and verifier scope.",
                auto_key="gcp_activity_documented",
            ),
            ChecklistItemDef(
                id="verifier_reference",
                category="Governance",
                question="Is an ICFRE or approved verifier reference on file?",
                guidance="Third-party verification is required for green credit issuance.",
                auto_key="verifier_on_file",
            ),
            ChecklistItemDef(
                id="density_eligible",
                category="Eligibility",
                question="Does stocking density meet GCP minimum trees per hectare?",
                guidance="Compare registered trees against mapped site area.",
                auto_key="density_eligible",
            ),
            ChecklistItemDef(
                id="nba_species_review",
                category="Safeguards",
                question="Are exotic, medicinal, or scheduled species flagged with NBA acknowledgment where required?",
                guidance="Biological Diversity Act benefit-sharing may apply to certain species.",
                auto_key="nba_species_reviewed",
                required=False,
            ),
            *_COMMON_MONITORING,
            ChecklistItemDef(
                id="evidence_export",
                category="Governance",
                question="Can auditors receive a packaged evidence bundle?",
                guidance="Use Compliance → Evidence bundle for verifier review.",
            ),
        ),
    ),
    "sahakar_van_coop": ComplianceChecklist(
        code="sahakar_van_coop",
        title="Sahakar Van — Cooperative Forest Readiness",
        short_label="Sahakar Van",
        framework_reference="NCCF–Amul Sahakar Van — Ministry of Cooperation",
        description=(
            "Cooperative afforestation compliance for NCCF and Amul-led Sahakar Van "
            "projects on arid land with Miyawaki and conventional planting."
        ),
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="nccf_amul_partnership",
                category="Governance",
                question="Are NCCF and Amul cooperative partnership references documented?",
                guidance="Record Sahakar Van project ID, NCCF reference, and Amul union name.",
            ),
            ChecklistItemDef(
                id="cooperative_society",
                category="Governance",
                question="Is the implementing cooperative society or women's group on record?",
                guidance="Sahakar Van emphasises cooperative-led community participation.",
            ),
            ChecklistItemDef(
                id="site_area_documented",
                category="Eligibility",
                question="Is the site area (acres) and village location documented?",
                guidance="Pilot sites range from 1 ha to 64 acres on arid or degraded land.",
            ),
            ChecklistItemDef(
                id="plantation_method_plan",
                category="Planting standard",
                question="Is the Miyawaki / conventional / mixed plantation method approved?",
                guidance="Sahakar Van combines dense Miyawaki patches with conventional blocks.",
            ),
            ChecklistItemDef(
                id="arid_species_list",
                category="Planting standard",
                question="Are only approved hardy local species (Khejri, Rohida, Neem, Ber, Babool) used?",
                guidance="Species must be suited to low-water, high-heat arid conditions.",
                auto_key="native_species_tracked",
            ),
            ChecklistItemDef(
                id="soil_rainwater_prep",
                category="Site preparation",
                question="Are soil treatment, organic manure, and rainwater harvesting measures in place?",
                guidance="Land levelling, gobar khad, and moisture conservation precede planting.",
            ),
            ChecklistItemDef(
                id="community_participation",
                category="Cooperative",
                question="Is community / cooperative participation in planting and maintenance documented?",
                guidance="Women's groups and cooperative members should lead maintenance activities.",
            ),
            ChecklistItemDef(
                id="geo_tagged_records",
                category="Monitoring",
                question="Are at least 80% of living trees geo-tagged with GPS coordinates?",
                guidance="Geo-tagged records support NCCF audit and cooperative accountability.",
                auto_key="geo_tagged_majority",
            ),
            ChecklistItemDef(
                id="no_blocking_violations",
                category="Compliance",
                question="Are blocking compliance violations resolved?",
                guidance="Species, spacing, and boundary violations must be cleared before submission.",
                auto_key="no_block_violations",
            ),
            ChecklistItemDef(
                id="survival_monitoring",
                category="Monitoring",
                question="Is a recurring survival / maintenance survey cadence configured?",
                guidance="Arid-land sites require seasonal survival checks and sapling protection.",
                auto_key="survival_survey_configured",
            ),
        ),
    ),
    "icvcm_ccp": ComplianceChecklist(
        code="icvcm_ccp",
        title="ICVCM Core Carbon Principles",
        short_label="ICVCM CCPs",
        framework_reference="Integrity Council for the Voluntary Carbon Market — CCPs",
        description=(
            "Alignment self-assessment against the ten Core Carbon Principles for "
            "high-integrity voluntary carbon credits."
        ),
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="effective_governance",
                category="Governance",
                question="Does the project demonstrate effective governance and program oversight?",
                guidance="Document roles, approvals, and conflict-of-interest controls.",
            ),
            ChecklistItemDef(
                id="tracking_registry",
                category="Tracking",
                question="Are credits uniquely tracked in a registry or ledger with serial numbers?",
                guidance="Use project credit ledger and serial retirement workflow.",
                auto_key="credit_ledger_active",
            ),
            ChecklistItemDef(
                id="transparency",
                category="Transparency",
                question="Is project information publicly verifiable or shareable with auditors?",
                guidance="Public verification links and evidence bundles support transparency.",
                auto_key="evidence_export",
            ),
            ChecklistItemDef(
                id="third_party_verification",
                category="Verification",
                question="Is independent third-party verification planned or completed?",
                guidance="Verifier sample workflow and attestation hashes.",
            ),
            ChecklistItemDef(
                id="additionality",
                category="Additionality",
                question="Is additionality documented beyond regulatory requirements?",
                guidance="Complete VM0047 additionality assessment on Credits tab.",
            ),
            ChecklistItemDef(
                id="permanence",
                category="Permanence",
                question="Are permanence risks assessed with buffer withholding (NPRT)?",
                guidance="NPRT assessment maps to dynamic buffer 10–30%.",
                auto_key="nprt_assessed",
            ),
            ChecklistItemDef(
                id="robust_quantification",
                category="Quantification",
                question="Is quantification robust with uncertainty and other carbon pools considered?",
                guidance="Engine supports 90% CI, mortality, deadwood, litter, and SOC pools.",
            ),
            ChecklistItemDef(
                id="no_double_counting",
                category="Tracking",
                question="Are double-claim conflicts prevented across scheme families?",
                guidance="Exclusive claim registry returns 409 on conflicts.",
            ),
            ChecklistItemDef(
                id="sustainable_development",
                category="Sustainable development",
                question="Are co-benefits and community impacts documented?",
                guidance="Biodiversity, survival KPIs, and scheme metadata.",
            ),
            ChecklistItemDef(
                id="net_zero_alignment",
                category="Transition",
                question="Is retirement aligned with net-zero or Paris Article 6 claims where applicable?",
                guidance="Serial retirement supports beneficiary and corresponding adjustment refs.",
                auto_key="ca_ref_documented",
            ),
        ),
    ),
    "article6_readiness": ComplianceChecklist(
        code="article6_readiness",
        title="Paris Agreement Article 6 — Readiness",
        short_label="Article 6",
        framework_reference="Paris Agreement Art. 6 (cooperative approaches)",
        description=(
            "Traceability checklist for authorized mitigation outcomes and corresponding "
            "adjustments — informational only, not registry authorization."
        ),
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="host_authorization",
                category="Governance",
                question="Is host-country authorization for cooperative approaches documented?",
                guidance="Reference MoEFCC or designated national authority authorization where applicable.",
                auto_key="article6_authorization_ref",
            ),
            ChecklistItemDef(
                id="corresponding_adjustment",
                category="Tracking",
                question="Are corresponding adjustment references recorded for retired ITMO-style serials?",
                guidance="Link ledger retirement to host-country CA registry entry.",
                auto_key="ca_ref_documented",
            ),
            ChecklistItemDef(
                id="no_double_counting",
                category="Integrity",
                question="Is double counting avoided across NDC and voluntary claims?",
                guidance="Exclusive claim registry and serial retirement prevent duplicate claims.",
                auto_key="credit_ledger_active",
            ),
            ChecklistItemDef(
                id="article6_serials",
                category="Tracking",
                question="Are Article 6-flagged serials minted and traceable in the credit ledger?",
                guidance="Mark serials at retirement with Paris Article 6 metadata.",
                auto_key="article6_serials_present",
            ),
            ChecklistItemDef(
                id="leakage_integrity",
                category="Quantification",
                question="Is leakage accounted before Article 6 traceability reporting?",
                guidance="Shared leakage worksheet supports VM0047, REDD+, and GS prep.",
                auto_key="leakage_documented",
            ),
        ),
    ),
    "world_bank_esf": ComplianceChecklist(
        code="world_bank_esf",
        title="World Bank ESF — Environmental & Social Screening",
        short_label="World Bank ESF",
        framework_reference="World Bank Environmental and Social Framework (ESF)",
        description=(
            "Performance Standards screening for plantation and green-corridor projects, "
            "with emphasis on PS5 land/tenure and PS6 biodiversity."
        ),
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="ps1_esms",
                category="PS1",
                question="Is an environmental and social management approach documented?",
                guidance="ESMS or equivalent management plan for the project lifecycle.",
            ),
            ChecklistItemDef(
                id="ps4_community_safety",
                category="PS4",
                question="Are community health and safety risks identified for field works?",
                guidance="Worker safety, traffic, and community interface along corridors.",
            ),
            ChecklistItemDef(
                id="ps5_land_tenure",
                category="PS5",
                question="Is land acquisition / tenure evidence documented (FPIC, Patta, gram sabha)?",
                guidance="PS5 evidence pack exports safeguards module documents.",
                auto_key="safeguards_tenure_ref",
            ),
            ChecklistItemDef(
                id="ps5_stakeholder",
                category="PS5",
                question="Is stakeholder engagement documented for land and resettlement risks?",
                guidance="Consultation logs and grievance pathways.",
                auto_key="safeguards_stakeholder_log",
            ),
            ChecklistItemDef(
                id="ps6_biodiversity",
                category="PS6",
                question="Is biodiversity monitored (native mix, NDVI habitat, bioacoustic richness)?",
                guidance="PS6 evidence pack aggregates satellite and soundscape signals.",
                auto_key="ps6_biodiversity_evidence",
            ),
            ChecklistItemDef(
                id="ps7_indigenous",
                category="PS7",
                question="Are indigenous / forest-dwelling community safeguards addressed?",
                guidance="FPIC minutes and FRA tenure references where applicable.",
                auto_key="safeguards_fpic",
            ),
            ChecklistItemDef(
                id="ps8_cultural",
                category="PS8",
                question="Are cultural heritage sensitivities screened for the project area?",
                guidance="Document known sacred sites or archaeological constraints.",
                required=False,
            ),
        ),
    ),
    "undp_ses": ComplianceChecklist(
        code="undp_ses",
        title="UNDP SES — Social & Environmental Screening",
        short_label="UNDP SES",
        framework_reference="UNDP Social and Environmental Standards",
        description="Risk screening and stakeholder engagement for DFI and UN-partnered green projects.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="ses_risk_screening",
                category="Screening",
                question="Has a SES risk screening been completed (low / medium / high)?",
                guidance="Export UNDP SES pack for computed risk tier and mitigations.",
                auto_key="ses_risk_screened",
            ),
            ChecklistItemDef(
                id="ses_stakeholder_log",
                category="Engagement",
                question="Is a stakeholder engagement log maintained and exportable?",
                guidance="Reuses safeguards module stakeholder consultation log.",
                auto_key="safeguards_stakeholder_log",
            ),
            ChecklistItemDef(
                id="ses_biodiversity",
                category="Environment",
                question="Are biodiversity and habitat indicators monitored?",
                guidance="NDVI, native species mix, and bioacoustic richness.",
                auto_key="ps6_biodiversity_evidence",
            ),
            ChecklistItemDef(
                id="ses_grievance",
                category="Governance",
                question="Is a grievance redress mechanism documented?",
                guidance="Link to org DPDP grievance workflow or project-level contact.",
                required=False,
            ),
            ChecklistItemDef(
                id="ses_gender_social",
                category="Social",
                question="Are gender and social inclusion considerations noted in engagement records?",
                guidance="Document women's groups, SHGs, or vulnerable household participation.",
                required=False,
            ),
        ),
    ),
    "sbti_flag": ComplianceChecklist(
        code="sbti_flag",
        title="SBTi FLAG — Land Sector Readiness",
        short_label="SBTi FLAG",
        framework_reference="SBTi Forest, Land and Agriculture (FLAG) Guidance",
        description=(
            "Land-related emissions and removals worksheet readiness for corporate "
            "FLAG target-setting — preparation only, not SBTi validation."
        ),
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="flag_boundary",
                category="Boundary",
                question="Is the FLAG land-sector boundary defined for plantation projects?",
                guidance="Include all ARR sites under operational control in the org portfolio.",
                auto_key="flag_land_boundary",
            ),
            ChecklistItemDef(
                id="flag_removals",
                category="Quantification",
                question="Are gross and net land removals quantified from a single MRV source?",
                guidance="VM0047 / GHG Protocol land-sector lines feed the FLAG worksheet.",
                auto_key="flag_removals_quantified",
            ),
            ChecklistItemDef(
                id="flag_leakage",
                category="Integrity",
                question="Is leakage deducted before reporting net land-sector removals?",
                guidance="Shared leakage worksheet supports FLAG, VM0047, and REDD+ prep.",
                auto_key="leakage_documented",
            ),
            ChecklistItemDef(
                id="flag_geo_coverage",
                category="Monitoring",
                question="Are plantation sites geo-tagged for spatial FLAG boundary evidence?",
                guidance="≥80% geo-tagged trees support spatial due diligence.",
                auto_key="geo_tagged_majority",
            ),
        ),
    ),
    "eudr_supplier_mrv": ComplianceChecklist(
        code="eudr_supplier_mrv",
        title="EU Deforestation Regulation — Supplier MRV",
        short_label="EUDR supplier MRV",
        framework_reference="EU Regulation 2023/1115 (EUDR) — due diligence preparation",
        description=(
            "Geo-coordinate due diligence and supplier linkage for corporate buyers "
            "proving plantation legality — not EU conformity assessment."
        ),
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="eudr_supplier_ref",
                category="Traceability",
                question="Is a supplier or value-chain reference recorded on the project?",
                guidance="Links to BRSR P6.E8 value-chain annex and buyer due diligence.",
                auto_key="supplier_ref_documented",
            ),
            ChecklistItemDef(
                id="eudr_geo_coords",
                category="Geolocation",
                question="Are geo-coordinates available for plantation sites and trees?",
                guidance="EUDR due diligence pack exports WGS84 centroids and sample tree points.",
                auto_key="eudr_geo_due_diligence",
            ),
            ChecklistItemDef(
                id="eudr_legality_docs",
                category="Legality",
                question="Are tenure / safeguards documents on file for legality evidence?",
                guidance="FPIC, gram sabha resolution, or Patta/CFR references.",
                auto_key="safeguards_gram_sabha",
            ),
            ChecklistItemDef(
                id="eudr_no_violations",
                category="Compliance",
                question="Are there no open blocking compliance violations?",
                guidance="Blocking violations must be resolved before buyer due diligence.",
                auto_key="no_block_violations",
            ),
        ),
    ),
    "fra_tenure": ComplianceChecklist(
        code="fra_tenure",
        title="FRA / Tenure & Safeguards",
        short_label="FRA / Tenure",
        framework_reference="Forest Rights Act 2006 / FPIC safeguards",
        description="Community tenure and free, prior, informed consent documentation for govt and co-op schemes.",
        disclaimer=DISCLAIMER,
        items=(
            ChecklistItemDef(
                id="gram_sabha_resolution",
                category="Tenure",
                question="Is a gram sabha resolution or equivalent community consent on file?",
                guidance="Required for CAMPA, Nagar Van, Sahakar Van, and MGNREGA convergence sites.",
                auto_key="safeguards_gram_sabha",
            ),
            ChecklistItemDef(
                id="fpic_minutes",
                category="Safeguards",
                question="Are FPIC or consultation minutes uploaded?",
                guidance="Document dates, participants, and outcomes of community consultation.",
                auto_key="safeguards_fpic",
            ),
            ChecklistItemDef(
                id="patta_cfr_reference",
                category="Tenure",
                question="Is Patta, CFR, or legal tenure reference documented?",
                guidance="Link plantation to forest rights or revenue land records.",
                auto_key="safeguards_tenure_ref",
            ),
            ChecklistItemDef(
                id="stakeholder_log",
                category="Safeguards",
                question="Is a stakeholder engagement log maintained?",
                guidance="Track consultations with gram sabha, cooperatives, or implementing agencies.",
                auto_key="safeguards_stakeholder_log",
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
