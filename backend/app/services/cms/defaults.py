"""Default marketing site content — mirrors shipped aranyix.tech homepage."""

from __future__ import annotations

from typing import Any

HEADER_DEFAULT: dict[str, Any] = {
    "nav": [
        {"label": "Platform", "href": "#platform"},
        {"label": "Compliance", "href": "#compliance"},
        {"label": "Programs", "href": "#programs"},
        {"label": "How it works", "href": "#how-it-works"},
    ],
    "sign_in": {"label": "Sign in", "href": "/auth?mode=signin"},
    "get_started": {"label": "Get started", "href": "/auth?mode=signup"},
}

FOOTER_DEFAULT: dict[str, Any] = {
    "description": (
        "Environmental monitoring, reporting, and verification for plantations and biodiversity — "
        "from satellite pixels to audit-ready evidence packs."
    ),
    "badge": "Intelligence for a thriving planet",
    "columns": [
        {
            "title": "Platform",
            "links": [
                {"label": "Dashboard", "href": "/auth?mode=signin&next=/dashboard"},
                {"label": "Register a tree", "href": "/auth?mode=signup"},
                {"label": "How it works", "href": "/#how-it-works"},
            ],
        },
        {
            "title": "Programs",
            "links": [
                {"label": "BYOT citizen tagging", "href": "/auth?mode=signup"},
                {"label": "Government & Public Sector", "href": "/auth?mode=signup"},
                {"label": "Corporate ESG", "href": "/auth?mode=signup"},
                {"label": "NGO & community", "href": "/auth?mode=signup"},
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
            "pill": "Environmental MRV platform",
            "pill_icon": "Sparkles",
            "title": "Intelligence for a",
            "title_highlight": "thriving planet",
            "subtitle": (
                "Tree registration, satellite monitoring, and audit-ready evidence — "
                "unified for every planting program."
            ),
            "primary_cta": {"label": "Start free registration", "href": "/auth?mode=signup"},
            "secondary_cta": {"label": "See how it works", "href": "#how-it-works"},
        },
    },
    {
        "section_type": "features",
        "anchor_id": "platform",
        "title": "Platform capabilities",
        "sort_order": 10,
        "content": {
            "eyebrow": "Platform capabilities",
            "title": "Everything you need to monitor, understand, and prove environmental impact",
            "copy": (
                "From a single citizen tree to million-tree portfolios, Aranyix delivers the same "
                "premium monitoring stack — designed for field teams, scientists, and compliance officers."
            ),
            "items": [
                {
                    "icon": "TreePine",
                    "title": "Tree monitoring",
                    "description": "Register every tree with GPS, photos, species, and a unique digital passport — QR code and PDF included.",
                    "accent": "from-emerald-500/20 to-emerald-900/5",
                },
                {
                    "icon": "Bird",
                    "title": "Biodiversity assessment",
                    "description": "Bioacoustic listening, species richness scoring, and habitat signals to quantify ecosystem health alongside planting evidence.",
                    "accent": "from-lime-500/20 to-lime-900/5",
                },
                {
                    "icon": "Brain",
                    "title": "AI insights & tips",
                    "description": "Species detection, disease classification, growth recommendations, and executive summaries powered by environmental AI.",
                    "accent": "from-sky-500/15 to-sky-900/5",
                },
                {
                    "icon": "Bell",
                    "title": "Monitoring & alerts",
                    "description": "NDVI change detection, health drift, fence breaches, and anomaly alerts delivered to teams in real time.",
                    "accent": "from-amber-500/15 to-amber-900/5",
                },
                {
                    "icon": "Satellite",
                    "title": "Satellite intelligence",
                    "description": "Sentinel-2 and Landsat pipelines for NDVI, canopy stress, and plantation boundary validation at scale.",
                    "accent": "from-teal-500/15 to-teal-900/5",
                },
                {
                    "icon": "FileCheck2",
                    "title": "Audit-ready reporting",
                    "description": "Framework-mapped evidence packs and exportable PDF / Excel reports for audit preparation — not credit issuance.",
                    "accent": "from-violet-500/12 to-violet-900/5",
                },
            ],
        },
    },
    {
        "section_type": "compliance",
        "anchor_id": "compliance",
        "title": "Compliance & frameworks",
        "sort_order": 20,
        "content": {
            "eyebrow": "Compliance & frameworks",
            "title": "Built for the standards your auditors already ask about",
            "copy": (
                "Aranyix maps field evidence, satellite signals, and AI analytics to the frameworks "
                "auditors and program officers already ask about — as MRV and audit-preparation tools, "
                "not as a carbon credit registry or legal certification body."
            ),
            "items": [
                {"icon": "Globe2", "code": "IPCC AR6", "title": "Science-based estimates", "description": "Biomass and CO₂e estimates aligned with IPCC AR6 guidance for inventory support."},
                {"icon": "Sprout", "code": "REDD+", "title": "Forest carbon MRV prep", "description": "Evidence structures for baseline, leakage, and permanence questionnaires — not FREL computation."},
                {"icon": "ShieldCheck", "code": "Paris Agreement", "title": "NDC traceability", "description": "Geo-tagged planting ledgers that support transparent reporting conversations."},
                {"icon": "MapPin", "code": "NHAI / Govt", "title": "Highway & public schemes", "description": "Geo-tagged planting proof for NHAI, forest department, and municipal greening audits."},
                {"icon": "Radar", "code": "NGT / Courts", "title": "Compensatory afforestation", "description": "Timestamped evidence packs for CAMPA / FCA monitoring — not a substitute for court filings."},
                {"icon": "FileCheck2", "code": "Verra VM0047", "title": "ARR evidence prep", "description": "Stratification, buffer math, and checklists for VM0047-style audit preparation."},
                {"icon": "Sparkles", "code": "Gold Standard", "title": "Safeguard checklists", "description": "Guided co-benefit and safeguard questionnaires for LUF readiness — not issuance."},
                {"icon": "Leaf", "code": "BYOT", "title": "Citizen stewardship", "description": "Bring Your Own Tree — lightweight public registration with complimentary AI health scans."},
            ],
        },
    },
    {
        "section_type": "programs",
        "anchor_id": "programs",
        "title": "Planting programs",
        "sort_order": 30,
        "content": {
            "eyebrow": "Planting programs",
            "title": "One account. Multiple compliance pathways.",
            "copy": "Enroll in BYOT, government, corporate ESG, or NGO programs from a single workspace. Each pathway applies the right validation rules without fragmenting your data.",
            "items": [
                {"icon": "Leaf", "title": "BYOT Public", "description": "Citizens and schools tag trees in minutes with mobile-first registration and QR passports.", "badge": "Most popular"},
                {"icon": "Building2", "title": "Government & Public Sector", "description": "Audit-grade planting for highways, urban forestry, and departmental compensatory schemes.", "badge": "Govt ready"},
                {"icon": "ShieldCheck", "title": "Industry & Corporate ESG", "description": "Plantation baselines, supplier traceability, and board-ready sustainability evidence.", "badge": "ESG"},
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
                {"step": "01", "title": "Register & enroll", "description": "Choose your program — BYOT, government, ESG, or NGO — and onboard your organization in one flow."},
                {"step": "02", "title": "Capture evidence", "description": "Add trees with GPS, photos, and species. Mobile apps and web wizards guide every required field."},
                {"step": "03", "title": "Monitor continuously", "description": "Satellite NDVI, AI health scoring, and bioacoustic biodiversity layers watch your sites 24/7."},
                {"step": "04", "title": "Report with confidence", "description": "Export dashboards, alerts, and framework-mapped evidence packs for auditor review."},
            ],
        },
    },
    {
        "section_type": "platform_preview",
        "anchor_id": None,
        "title": "Platform preview",
        "sort_order": 50,
        "content": {
            "eyebrow": "Inside the platform",
            "title": "A command center for plantations and biodiversity",
            "copy": "Executive dashboards surface tree health, satellite anomalies, species richness, and alert queues — with exports tailored to your enrolled programs.",
            "bullets": [
                "Interactive Google Maps plantation view with health overlays",
                "Executive dashboards for health, biodiversity, and alerts",
                "Multi-program enrollment on a single account",
                "REST API for integrations and GIS exports",
            ],
            "metrics": [
                ["12,480", "Trees registered"],
                ["0.72", "Mean NDVI"],
                ["94%", "Passport complete"],
            ],
            "rows": [
                ["Satellite canopy stress", "2 sites flagged"],
                ["Bioacoustic richness", "Stable this week"],
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
            "copy": "Join organizations using Aranyix for plantation monitoring, biodiversity assessment, and MRV evidence packs — from citizen BYOT to government-grade field programs.",
            "primary_cta": {"label": "Get started free", "href": "/auth?mode=signup"},
            "secondary_cta": {"label": "Sign in to workspace", "href": "/auth?mode=signin"},
        },
    },
]

HOME_PAGE_DEFAULT = {
    "slug": "home",
    "title": "Aranyix — Intelligence for a Thriving Planet",
    "meta_description": (
        "Environmental monitoring, reporting, and verification for plantations and biodiversity — "
        "audit-prep MRV, not carbon credit issuance."
    ),
    "published": True,
    "is_home": True,
}

SECTION_TYPES = (
    "hero",
    "features",
    "compliance",
    "programs",
    "steps",
    "platform_preview",
    "cta",
    "rich_text",
)
