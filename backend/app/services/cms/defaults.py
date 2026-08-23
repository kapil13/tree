"""Default marketing site content — mirrors shipped aranyix.tech homepage."""

from __future__ import annotations

from typing import Any

HEADER_DEFAULT: dict[str, Any] = {
    "nav": [
        {"label": "Platform", "href": "#platform"},
        {"label": "Intelligence", "href": "#intelligence"},
        {"label": "Compliance", "href": "#compliance"},
        {"label": "Reports", "href": "#reports"},
        {"label": "Programs", "href": "#programs"},
        {"label": "How it works", "href": "#how-it-works"},
    ],
    "sign_in": {"label": "Sign in", "href": "/auth?mode=signin"},
    "get_started": {"label": "Get started", "href": "/auth?mode=signup"},
}

FOOTER_DEFAULT: dict[str, Any] = {
    "description": (
        "India's environmental MRV platform — from citizen tree tagging to government-grade "
        "satellite fusion, bioacoustic biodiversity, and audit-ready compliance exports."
    ),
    "badge": "Intelligence for a thriving planet",
    "columns": [
        {
            "title": "Platform",
            "links": [
                {"label": "Executive dashboard", "href": "/auth?mode=signin&next=/dashboard"},
                {"label": "Register a tree", "href": "/auth?mode=signup"},
                {"label": "Field operations", "href": "/auth?mode=signin&next=/field-ops"},
                {"label": "Reports & exports", "href": "/auth?mode=signin&next=/reports"},
            ],
        },
        {
            "title": "Programs",
            "links": [
                {"label": "BYOT citizen tagging", "href": "/auth?mode=signup"},
                {"label": "Government & NHAI", "href": "/auth?mode=signup"},
                {"label": "Corporate ESG", "href": "/auth?mode=signup"},
                {"label": "NGO & community", "href": "/auth?mode=signup"},
            ],
        },
        {
            "title": "Compliance",
            "links": [
                {"label": "DPDP privacy controls", "href": "/privacy"},
                {"label": "BRSR & ISO exports", "href": "/auth?mode=signin&next=/reports"},
                {"label": "VM0047 checklists", "href": "/#compliance"},
                {"label": "Audit evidence chain", "href": "/#compliance"},
            ],
        },
        {
            "title": "Legal",
            "links": [
                {"label": "Terms of Service", "href": "/terms"},
                {"label": "Privacy Policy", "href": "/privacy"},
                {"label": "Data Use Policy", "href": "/data-use"},
                {"label": "Sign in", "href": "/auth?mode=signin"},
            ],
        },
    ],
    "copyright": "Aranyix. All rights reserved.",
    "legal_note": "MRV & audit-prep platform · Not a carbon credit issuer",
}

HOME_SECTIONS_DEFAULT: list[dict[str, Any]] = [
    {
        "section_type": "hero",
        "anchor_id": None,
        "title": "Hero",
        "sort_order": 0,
        "content": {
            "pill": "MRV · Compliance · Reporting",
            "pill_icon": "Sparkles",
            "title": "Environmental intelligence",
            "title_highlight": "from field to audit room",
            "subtitle": (
                "Register trees on mobile, fuse NDVI with SAR integrity, score biodiversity "
                "with bioacoustics, and export BRSR, ISO 14064-2, TNFD, and VM0047 evidence — "
                "one platform for citizens, corporates, and government programs."
            ),
            "stats": [
                {"value": "15+", "label": "Framework mappings"},
                {"value": "8", "label": "Indian languages"},
                {"value": "SAR + NDVI", "label": "Satellite fusion"},
                {"value": "DPDP ready", "label": "Privacy controls"},
            ],
            "primary_cta": {"label": "Start free registration", "href": "/auth?mode=signup"},
            "secondary_cta": {"label": "Explore the platform", "href": "#platform"},
        },
    },
    {
        "section_type": "stats",
        "anchor_id": None,
        "title": "Trust metrics",
        "sort_order": 5,
        "content": {
            "items": [
                {"value": "10M+", "label": "Trees target scale", "detail": "Built for national programs"},
                {"value": "24/7", "label": "Monitoring", "detail": "Satellite + alert fusion"},
                {"value": "100%", "label": "Evidence chain", "detail": "Tamper-evident audit trail"},
                {"value": "PWA", "label": "Field offline", "detail": "Supervisor tree cache"},
            ],
        },
    },
    {
        "section_type": "features",
        "anchor_id": "platform",
        "title": "Platform capabilities",
        "sort_order": 10,
        "content": {
            "eyebrow": "Platform",
            "title": "Everything to monitor, prove, and report environmental impact",
            "copy": (
                "From a single citizen neem tree to million-tree portfolios — the same premium "
                "MRV stack for field teams, scientists, compliance officers, and board reviewers."
            ),
            "items": [
                {
                    "icon": "TreePine",
                    "title": "Tree MRV & passports",
                    "description": "GPS registration, digital passports, QR codes, chainage for highways, and project setup wizards tuned to each scheme.",
                    "accent": "from-emerald-500/20 to-emerald-900/5",
                },
                {
                    "icon": "Smartphone",
                    "title": "Mobile field operations",
                    "description": "Android field app with offline tree cache, photo capture, and register-next flows for high-volume planting drives.",
                    "accent": "from-lime-500/20 to-lime-900/5",
                },
                {
                    "icon": "Satellite",
                    "title": "Satellite & SAR fusion",
                    "description": "Sentinel NDVI health layers plus SAR integrity trends, fence validation, and portfolio threat dashboards.",
                    "accent": "from-sky-500/15 to-sky-900/5",
                },
                {
                    "icon": "Mic",
                    "title": "Bioacoustic biodiversity",
                    "description": "BirdNET-powered species detection, richness scoring, and habitat signals alongside planting evidence.",
                    "accent": "from-teal-500/15 to-teal-900/5",
                },
                {
                    "icon": "Brain",
                    "title": "AI intelligence layer",
                    "description": "Species ID, health classification, executive summaries, and an in-app assistant for field and ops teams.",
                    "accent": "from-violet-500/12 to-violet-900/5",
                },
                {
                    "icon": "BarChart3",
                    "title": "Executive dashboards",
                    "description": "Portfolio health, carbon NPRT buffers, plot monitoring designs, and stratified sampling for verifier workflows.",
                    "accent": "from-amber-500/15 to-amber-900/5",
                },
                {
                    "icon": "Bell",
                    "title": "Alerts & field actions",
                    "description": "Canopy stress, mortality drift, fence breaches, and SAR anomalies routed to supervisors with verification loops.",
                    "accent": "from-rose-500/12 to-rose-900/5",
                },
                {
                    "icon": "ScanLine",
                    "title": "Rule engine & schemes",
                    "description": "Central scheme registry with NHAI, CAMPA, Nagar Van, and corporate templates — validation rules per program.",
                    "accent": "from-indigo-500/12 to-indigo-900/5",
                },
            ],
        },
    },
    {
        "section_type": "intelligence_pipeline",
        "anchor_id": "intelligence",
        "title": "Intelligence pipeline",
        "sort_order": 15,
        "content": {
            "eyebrow": "Intelligence stack",
            "title": "Five layers. One audit-ready story.",
            "copy": (
                "Field evidence, orbital signals, acoustic biodiversity, and AI fusion converge "
                "into signed exports your auditors and program officers can actually review."
            ),
        },
    },
    {
        "section_type": "compliance",
        "anchor_id": "compliance",
        "title": "Compliance & frameworks",
        "sort_order": 20,
        "content": {
            "eyebrow": "Compliance",
            "title": "Mapped to the standards your auditors already ask about",
            "copy": (
                "Aranyix is an MRV and audit-preparation platform — not a carbon credit registry "
                "or legal certification body. We structure evidence so review conversations move faster."
            ),
            "items": [
                {"icon": "Lock", "code": "DPDP Act", "title": "India data privacy", "description": "Export, erasure, consent ledger, and grievance workflows built into settings."},
                {"icon": "FileText", "code": "BRSR / SEBI", "title": "Corporate disclosure", "description": "Principle 6 environment indicators mapped to plantation and carbon evidence."},
                {"icon": "Scale", "code": "ISO 14064-2", "title": "Project GHG reports", "description": "Structured project reports aligned with ISO 14064-2 methodology sections."},
                {"icon": "Leaf", "code": "TNFD", "title": "Nature disclosures", "description": "LEAP-style nature reports from bioacoustic richness and NDVI habitat signals."},
                {"icon": "FileCheck2", "code": "VM0047", "title": "Verra ARR prep", "description": "Stratified sampling, buffer math, uncertainty tiers, and ICVCM alignment checklists."},
                {"icon": "Award", "code": "Gold Standard", "title": "Gold Standard LUF", "description": "Land Use & Forests carbon and co-benefit evidence packs for voluntary verification prep."},
                {"icon": "Trees", "code": "REDD+", "title": "REDD+ MRV", "description": "Baseline, permanence, and leakage evidence structures aligned to UNFCCC Warsaw Framework."},
                {"icon": "Globe2", "code": "Paris / NDC", "title": "Paris Agreement traceability", "description": "Geo-tagged planting ledger supporting national commitments and Article 6 transparency."},
                {"icon": "Globe2", "code": "Article 6", "title": "Article 6 readiness", "description": "Cooperative approaches checklist with corresponding adjustment refs and serial traceability."},
                {"icon": "Globe2", "code": "ETF / BTR", "title": "National inventory handoff", "description": "IPCC-aligned org roll-up for Enhanced Transparency Framework and BTR preparation."},
                {"icon": "Landmark", "code": "World Bank ESF", "title": "ESF safeguard screening", "description": "PS5 land/tenure and PS6 biodiversity evidence packs for DFI-backed corridors."},
                {"icon": "Handshake", "code": "UNDP SES", "title": "UNDP SES screening", "description": "Social and environmental risk screening with stakeholder engagement exports."},
                {"icon": "Target", "code": "SBTi FLAG", "title": "Land-sector targets", "description": "FLAG removals worksheet linked to VM0047 and GHG Protocol single source of truth."},
                {"icon": "Globe2", "code": "GBF", "title": "Global Biodiversity Framework", "description": "Targets 2 & 3 indicator mapping bridged to TNFD LEAP disclosures."},
                {"icon": "MapPin", "code": "EUDR", "title": "Supplier geo MRV", "description": "Geo-coordinate due diligence for corporate buyers and BRSR value-chain linkage."},
                {"icon": "Scale", "code": "ISO 14064-1", "title": "Org GHG inventory", "description": "Organizational inventory export complementing ISO 14064-2 project reports."},
                {"icon": "BadgeCheck", "code": "Green Credit", "title": "MoEFCC Green Credit", "description": "Land bank registration and verifier-ready planting evidence under Green Credit Rules 2023."},
                {"icon": "ShieldCheck", "code": "ICVCM", "title": "Core Carbon Principles", "description": "Integrity checklist mapped to field evidence and monitoring automation."},
                {"icon": "Globe2", "code": "IPCC AR6", "title": "Science-based estimates", "description": "Biomass and CO₂e estimates with IPCC-aligned defaults and NPRT buffers."},
                {"icon": "MapPin", "code": "NHAI / Govt", "title": "Public planting schemes", "description": "Geo-tagged proof for highways, urban forestry, and departmental green audits."},
                {"icon": "Radar", "code": "CAMPA / NGT", "title": "Compensatory afforestation", "description": "Timestamped evidence packs for court-ordered and CAMPA monitoring workflows."},
                {"icon": "Shield", "code": "Audit chain", "title": "Tamper-evident logs", "description": "Signed evidence bundles and Ed25519 verification for audit trail integrity."},
                {"icon": "Languages", "code": "WCAG + i18n", "title": "Inclusive by design", "description": "Hindi plus seven Indian languages on web; WCAG-tested core routes."},
                {"icon": "Sparkles", "code": "BYOT", "title": "Citizen stewardship", "description": "Bring Your Own Tree — public registration with complimentary AI health scans."},
            ],
        },
    },
    {
        "section_type": "reports",
        "anchor_id": "reports",
        "title": "Reports & exports",
        "sort_order": 25,
        "content": {
            "eyebrow": "Reports",
            "title": "Sixteen live exports. One evidence graph.",
            "copy": (
                "BRSR, ISO, TNFD, GHG Protocol, Darwin Core, VM0047, Gold Standard, REDD+, "
                "Paris/NDC, ETF/BTR handoff, SBTi FLAG, GBF, EUDR, ISO 14064-1 org inventory, "
                "Green Credit, inventory, carbon, biodiversity, ESG, executive digest, "
                "and signed evidence — generated from the same plantation record. Assurance packs, "
                "not credit issuance."
            ),
            "items": [
                {"icon": "FileText", "tag": "BRSR", "title": "BRSR assurance pack", "description": "SEBI-aligned Principle 6 export with plantation KPIs and evidence references.", "formats": "PDF · XLSX"},
                {"icon": "Scale", "tag": "ISO 14064-2", "title": "ISO 14064-2 project report", "description": "Project boundary, monitoring plan, and quantification sections pre-structured.", "formats": "PDF · XLSX"},
                {"icon": "Leaf", "tag": "TNFD", "title": "TNFD LEAP disclosure", "description": "Locate–Evaluate–Assess–Prepare narrative from satellite and bioacoustic layers.", "formats": "PDF · XLSX"},
                {"icon": "Globe2", "tag": "GHG Protocol", "title": "GHG land-sector inventory", "description": "Land-sector removals and emissions structured for corporate GHG Protocol reporting.", "formats": "PDF · XLSX"},
                {"icon": "Bird", "tag": "Darwin Core", "title": "Darwin Core occurrence pack", "description": "Species occurrence archive for biodiversity partners and scientific reuse.", "formats": "ZIP · JSON"},
                {"icon": "FileCheck2", "tag": "VM0047", "title": "Carbon credit ledger", "description": "Serial tracking, verifier sampling, and NPRT buffer assessments per project.", "formats": "PDF · XLSX"},
                {"icon": "Award", "tag": "Gold Standard", "title": "Gold Standard LUF report", "description": "Land Use & Forests framework-mapped PDF and Excel for voluntary verification prep.", "formats": "PDF · XLSX"},
                {"icon": "Trees", "tag": "REDD+", "title": "REDD+ MRV report", "description": "Baseline, permanence, and leakage sections structured for REDD+ program review.", "formats": "PDF · XLSX"},
                {"icon": "Globe2", "tag": "Paris / NDC", "title": "Paris Agreement traceability", "description": "NDC-aligned planting ledger export with Article 6 cooperative-approaches context.", "formats": "PDF · XLSX"},
                {"icon": "Globe2", "tag": "ETF / BTR", "title": "National inventory handoff", "description": "Org-level IPCC activity tables with leakage, buffer, and SAR integrity flags for ETF/BTR pilots.", "formats": "CSV · XLSX"},
                {"icon": "Target", "tag": "SBTi FLAG", "title": "FLAG land-sector worksheet", "description": "Land-related removals vs target boundary linked to VM0047 and GHG exports.", "formats": "XLSX"},
                {"icon": "Dna", "tag": "GBF", "title": "GBF indicator mapping", "description": "Kunming-Montreal Targets 2 & 3 metrics bridged to TNFD nature disclosures.", "formats": "XLSX"},
                {"icon": "MapPin", "tag": "EUDR", "title": "Supplier geo due diligence", "description": "WGS84 coordinate pack with BRSR value-chain linkage for corporate buyers.", "formats": "XLSX · ZIP"},
                {"icon": "Scale", "tag": "ISO 14064-1", "title": "Organizational GHG inventory", "description": "Org-level inventory complementing ISO 14064-2 project quantification reports.", "formats": "JSON · XLSX · ZIP"},
                {"icon": "BadgeCheck", "tag": "Green Credit", "title": "Green Credit India pack", "description": "MoEFCC Green Credit Programme evidence with land bank and survival KPIs.", "formats": "PDF · XLSX"},
                {"icon": "TreePine", "tag": "Inventory", "title": "Tree inventory", "description": "Species, survival, geotag status, and chainage for compliance packs.", "formats": "PDF · XLSX"},
                {"icon": "BarChart3", "tag": "Carbon", "title": "Carbon stock estimate", "description": "Modelled biomass and CO₂e with IPCC-aligned defaults — not a credit issuance.", "formats": "PDF · XLSX"},
                {"icon": "Mic", "tag": "Biodiversity", "title": "Biodiversity soundscape", "description": "BirdNET richness and habitat signals for a fenced plantation site.", "formats": "PDF · XLSX"},
                {"icon": "ShieldCheck", "tag": "ESG", "title": "ESG stakeholder summary", "description": "Combined carbon, biodiversity, and NDVI narrative for boards and buyers.", "formats": "PDF · XLSX"},
                {"icon": "Radar", "tag": "Executive", "title": "Portfolio health digest", "description": "NDVI trends, SAR threats, and compliance completion scores for leadership.", "formats": "PDF"},
                {"icon": "Shield", "tag": "Evidence", "title": "Signed evidence bundle", "description": "Tamper-evident ZIP with Ed25519 audit-chain verification for third-party review.", "formats": "ZIP"},
            ],
        },
    },
    {
        "section_type": "programs",
        "anchor_id": "programs",
        "title": "Planting programs",
        "sort_order": 30,
        "content": {
            "eyebrow": "Programs",
            "title": "One workspace. Every compliance pathway.",
            "copy": (
                "Enroll in BYOT, government, corporate ESG, or NGO programs from a single account. "
                "Each pathway applies the right validation rules without fragmenting your data."
            ),
            "items": [
                {"icon": "Leaf", "title": "BYOT Public", "description": "Citizens and schools tag trees in minutes with mobile-first registration and QR passports.", "badge": "Most popular"},
                {"icon": "Building2", "title": "Government & Public Sector", "description": "NHAI chainage, CAMPA monitoring, Nagar Van urban templates, and audit-grade field evidence.", "badge": "Govt ready"},
                {"icon": "ShieldCheck", "title": "Industry & Corporate ESG", "description": "Plantation baselines, BRSR exports, supplier traceability, and board-ready sustainability packs.", "badge": "ESG"},
                {"icon": "Users", "title": "NGO & Community", "description": "Watershed restoration, farmer groups, and community nurseries with shared dashboards.", "badge": "Community"},
            ],
        },
    },
    {
        "section_type": "steps",
        "anchor_id": "how-it-works",
        "title": "How it works",
        "sort_order": 40,
        "content": {
            "eyebrow": "How it works",
            "title": "From first tree to audit-ready portfolio",
            "copy": "A guided flow for field teams, backed by automated monitoring and executive reporting.",
            "cta": {"label": "Create your workspace", "href": "/auth?mode=signup"},
            "items": [
                {"step": "01", "title": "Enroll & set up", "description": "Pick your program — BYOT, government, ESG, or NGO — and complete the project setup wizard with scheme-specific rules."},
                {"step": "02", "title": "Register evidence", "description": "Capture trees with GPS, photos, and species on web or mobile. Chainage auto-advances for highway corridors."},
                {"step": "03", "title": "Monitor continuously", "description": "Satellite NDVI, SAR integrity, bioacoustic richness, and AI health scoring watch your sites around the clock."},
                {"step": "04", "title": "Act on alerts", "description": "Supervisors receive canopy stress and anomaly alerts with field verification workflows built in."},
                {"step": "05", "title": "Report with confidence", "description": "Export BRSR, ISO, TNFD, VM0047, Gold Standard, REDD+, Paris/NDC, and Green Credit packs — plus signed evidence bundles for auditor review."},
            ],
        },
    },
    {
        "section_type": "platform_preview",
        "anchor_id": None,
        "title": "Platform preview",
        "sort_order": 50,
        "content": {
            "eyebrow": "Live command center",
            "title": "See your plantation portfolio at a glance",
            "copy": (
                "Executive dashboards surface tree health, SAR anomalies, species richness, "
                "compliance completion, and alert queues — with exports tailored to enrolled programs."
            ),
            "bullets": [
                "Interactive maps with NDVI and SAR integrity overlays",
                "Executive dashboard for health, biodiversity, and compliance KPIs",
                "Multi-program enrollment on a single organization account",
                "REST API, webhooks, and GIS-friendly exports",
            ],
            "metrics": [
                ["12,480", "Trees registered"],
                ["0.72", "Mean NDVI"],
                ["94%", "Passport complete"],
            ],
            "rows": [
                ["SAR canopy integrity", "2 sites flagged"],
                ["Bioacoustic richness", "Stable this week"],
                ["Compliance checklists", "87% complete"],
                ["CO₂e estimate", "1,240 tCO₂e (modelled)"],
            ],
        },
    },
    {
        "section_type": "cta",
        "anchor_id": None,
        "title": "Call to action",
        "sort_order": 60,
        "content": {
            "eyebrow": "Ready to begin?",
            "title": "Turn every tree into audit-ready environmental evidence",
            "copy": (
                "Join organizations using Aranyix for plantation monitoring, biodiversity assessment, "
                "and compliance exports — from citizen BYOT to government-grade field programs."
            ),
            "primary_cta": {"label": "Get started free", "href": "/auth?mode=signup"},
            "secondary_cta": {"label": "Sign in to workspace", "href": "/auth?mode=signin"},
        },
    },
]

HOME_PAGE_DEFAULT = {
    "slug": "home",
    "title": "Aranyix — Intelligence for a Thriving Planet",
    "meta_description": (
        "Environmental MRV platform — satellite SAR fusion, bioacoustic biodiversity, "
        "DPDP privacy, and BRSR, ISO 14064-2, TNFD, VM0047 audit-ready exports."
    ),
    "published": True,
    "is_home": True,
}

SECTION_TYPES = (
    "hero",
    "stats",
    "features",
    "intelligence_pipeline",
    "compliance",
    "reports",
    "programs",
    "steps",
    "platform_preview",
    "cta",
    "rich_text",
)
