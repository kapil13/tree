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
        "Environmental monitoring, reporting, and verification for plantations, biodiversity, "
        "and carbon programs — from satellite pixels to audit-ready evidence."
    ),
    "badge": "Intelligence for a thriving planet",
    "columns": [
        {
            "title": "Platform",
            "links": [
                {"label": "Dashboard", "href": "/dashboard"},
                {"label": "Register a tree", "href": "/auth?mode=signup"},
                {"label": "API documentation", "href": "/docs"},
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
            "title": "Company",
            "links": [
                {"label": "Compliance frameworks", "href": "#compliance"},
                {"label": "How it works", "href": "#how-it-works"},
                {"label": "Sign in", "href": "/auth?mode=signin"},
            ],
        },
    ],
    "copyright": "Aranyix. All rights reserved.",
    "legal_note": "Apache-2.0 · Open MRV infrastructure",
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
                "Aranyix unifies tree registration, satellite monitoring, biodiversity signals, and "
                "AI insights into one premium platform — so every planting program can prove impact "
                "with audit-ready evidence."
            ),
            "primary_cta": {"label": "Start free registration", "href": "/auth?mode=signup"},
            "secondary_cta": {"label": "Explore dashboard", "href": "/dashboard"},
            "stats": [
                {"value": "10M+", "label": "Trees at planetary scale"},
                {"value": "100+", "label": "Species in AI catalog"},
                {"value": "24/7", "label": "Satellite & alert monitoring"},
                {"value": "IPCC", "label": "AR6-aligned carbon engine"},
            ],
            "float_cards": [
                {
                    "icon": "Satellite",
                    "title": "Live NDVI scan",
                    "subtitle": "Sentinel-2 · updated daily",
                },
                {
                    "icon": "Bird",
                    "title": "Biodiversity index",
                    "subtitle": "+18 species this season",
                },
            ],
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
                    "description": "Bioacoustic listening, species richness scoring, and habitat signals to quantify ecosystem health beyond carbon.",
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
                    "description": "Carbon projections, Verra VM0047 pathways, Gold Standard outputs, and exportable PDF / Excel evidence packs.",
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
                "behind carbon markets, government planting schemes, and environmental litigation."
            ),
            "items": [
                {"icon": "Globe2", "code": "IPCC AR6", "title": "Science-based carbon", "description": "Tiered emission factors, biomass models, and growth curves aligned with IPCC AR6 guidance."},
                {"icon": "Sprout", "code": "REDD+", "title": "Forest carbon MRV", "description": "Baseline, leakage, and permanence evidence structures for REDD+ and jurisdictional programs."},
                {"icon": "ShieldCheck", "code": "Paris Agreement", "title": "NDC & Article 6", "description": "Traceable planting records that support national commitments and cooperative approaches."},
                {"icon": "MapPin", "code": "NHAI / Govt", "title": "Highway & public schemes", "description": "Geo-tagged planting proof for NHAI, forest department, and municipal greening audits."},
                {"icon": "Radar", "code": "NGT / Courts", "title": "Compensatory afforestation", "description": "Timestamped evidence chains for CAMPA, FCA compliance, and judicial monitoring orders."},
                {"icon": "FileCheck2", "code": "Verra VCS", "title": "Verified carbon units", "description": "VM0047-ready project data, permanence buffers, and monitoring report foundations."},
                {"icon": "Sparkles", "code": "Gold Standard", "title": "Premium credits", "description": "Co-benefit documentation for biodiversity, community, and SDG-linked outcomes."},
                {"icon": "Leaf", "code": "BYOT", "title": "Citizen stewardship", "description": "Bring Your Own Tree — lightweight public registration that scales into verified portfolios."},
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
                {"icon": "Building2", "title": "Government & NHAI", "description": "Audit-grade planting for highways, urban forestry, and departmental compensatory schemes.", "badge": "Govt ready"},
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
                {"step": "04", "title": "Report with confidence", "description": "Export compliance-ready dashboards, alerts, and carbon reports mapped to your frameworks."},
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
            "title": "A command center for plantations, carbon, and biodiversity",
            "copy": "Executive dashboards surface tree health, satellite anomalies, species richness, and alert queues — with exports tailored to your enrolled programs.",
            "bullets": [
                "Interactive Google Maps plantation view with health overlays",
                "Executive dashboards for carbon, biodiversity, and alerts",
                "Multi-program enrollment on a single account",
                "REST API for integrations, GIS exports, and enterprise SSO",
            ],
            "metrics": [
                ["12,480", "Trees registered"],
                ["0.72", "Mean NDVI"],
                ["94%", "Passport complete"],
            ],
            "rows": [
                ["Satellite canopy stress", "2 sites flagged"],
                ["Bioacoustic richness", "Stable this week"],
                ["Carbon projection", "1,240 tCO₂e est."],
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
            "title": "Turn every tree into verified environmental intelligence",
            "copy": "Join organizations using Aranyix for plantation monitoring, biodiversity assessment, and compliance-ready carbon evidence — from citizen BYOT to government-grade MRV.",
            "primary_cta": {"label": "Get started free", "href": "/auth?mode=signup"},
            "secondary_cta": {"label": "Sign in to workspace", "href": "/auth?mode=signin"},
        },
    },
]

HOME_PAGE_DEFAULT = {
    "slug": "home",
    "title": "Aranyix — Intelligence for a Thriving Planet",
    "meta_description": (
        "Environmental monitoring, reporting, and verification for plantations, biodiversity, "
        "and carbon programs."
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
