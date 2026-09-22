export type SolutionSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type SolutionFaq = {
  question: string;
  answer: string;
};

export type SolutionPage = {
  slug: string;
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: SolutionSection[];
  faqs: SolutionFaq[];
  relatedLinks: Array<{ label: string; href: string }>;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "csr-plantation",
    path: "/solutions/csr-plantation",
    eyebrow: "CSR & corporate greening",
    title: "CSR plantation monitoring and audit-ready reporting",
    description:
      "Geo-tagged CSR plantation MRV for Indian corporates — survival tracking, photo evidence, satellite health, and BRSR-ready exports from one platform.",
    intro:
      "Corporate social responsibility tree plantations need more than event-day photos. Boards, auditors, and ESG teams expect geo-tagged proof of planting, survival over time, and traceable evidence that links spend to hectares on the ground. Aranyix helps CSR and sustainability teams run plantation MRV from field registration through audit-prep reporting — without claiming registry carbon credits we do not issue.",
    sections: [
      {
        heading: "Why CSR plantations fail audits",
        paragraphs: [
          "Many CSR programmes capture planting day well but lose visibility after the monsoon. Spreadsheets, WhatsApp albums, and one-off PDFs make it hard to answer basic auditor questions: how many trees survived, where they were planted, and which vendor or NGO block they belong to.",
          "Aranyix standardises geo-tagged registration, survival checks, and photo evidence so CSR teams can show a continuous chain from budget line to map pin — the level of detail sustainability reviewers and internal audit increasingly expect.",
        ],
      },
      {
        heading: "What Aranyix delivers for CSR teams",
        paragraphs: [
          "Field teams register trees with GPS, species, and photos on mobile — online or offline. Programme managers see portfolio dashboards, satellite-derived health signals, and scheme-aligned exports without rebuilding data in Excel every quarter.",
        ],
        bullets: [
          "Geo-tagged tree registry with digital passports per plant",
          "Survival and mortality tracking across planting seasons",
          "Photo evidence chain suitable for audit-prep packs",
          "Executive dashboards for board and ESG committee updates",
          "BRSR Principle 6 and plantation report exports",
        ],
      },
      {
        heading: "Typical CSR rollout",
        paragraphs: [
          "Most corporates start with a 90-day pilot on one to three sites, then expand to a full state or national CSR footprint. We help you define species lists, survival check cadence, and export templates aligned to your auditor's ask — not a generic certificate.",
          "Ready to scope a pilot? Use the contact form with your hectares, site count, and reporting deadline. We respond within two business days with a recommended rollout plan.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Aranyix issue carbon credits for our CSR plantations?",
        answer:
          "No. Aranyix provides plantation MRV, survival tracking, and audit-prep evidence. We do not issue Verra, Gold Standard, or other registry carbon credits, and we are not a certification body.",
      },
      {
        question: "Does this work for NGO-implemented CSR projects?",
        answer:
          "Yes. NGOs can register trees on mobile while corporates retain programme-level dashboards, exports, and role-based access for sustainability and audit teams.",
      },
      {
        question: "Which exports help with BRSR reporting?",
        answer:
          "Aranyix supports plantation evidence packs and BRSR-aligned exports that document geo-tagged planting, survival, and programme KPIs. Final BRSR assurance remains with your auditor.",
      },
    ],
    relatedLinks: [
      { label: "BRSR & ESG reporting", href: "/solutions/brsr-esg" },
      { label: "Plantation MRV product", href: "/product/mrv" },
      { label: "Resources & guides", href: "/resources" },
    ],
    primaryCta: { label: "Request a CSR pilot", href: "/contact" },
    secondaryCta: { label: "Book a demo", href: "/demo" },
  },
  {
    slug: "mining-greening",
    path: "/solutions/mining-greening",
    eyebrow: "Mining & reclamation",
    title: "Mining green belt and reclamation MRV",
    description:
      "Satellite-backed green belt monitoring for mines and reclamation sites — geo-tagged plantations, survival tracking, fence compliance, and audit-prep evidence for Indian operators.",
    intro:
      "Mining green belts and progressive reclamation require proof that plantations survive beyond compliance filings. Regulators, communities, and corporate boards all ask the same questions: are trees alive, are they inside the approved boundary, and can you show evidence without dispatching teams to every hectare every week? Aranyix fuses field registration with NDVI and SAR signals for continuous plantation MRV.",
    sections: [
      {
        heading: "Green belt monitoring at mine scale",
        paragraphs: [
          "Large reclamation footprints span hundreds or thousands of hectares across fragmented blocks. Manual tally sheets rarely survive a site transfer or monsoon season. Aranyix gives reclamation teams a single registry tied to work areas, species mixes, and planting years.",
          "Satellite health layers highlight stress pockets before they become compliance violations, while field teams close the loop with geo-tagged survival surveys and photo proof.",
        ],
      },
      {
        heading: "Built for Indian mining compliance workflows",
        paragraphs: [
          "Whether you report to state forest departments, internal sustainability committees, or integrated mine closure plans, Aranyix organises evidence by project, block, and financial year — ready for audit-prep packs rather than last-minute slide decks.",
        ],
        bullets: [
          "Work-area and fence-aware geo registration",
          "NDVI and SAR fusion for plantation health trends",
          "Survival, mortality, and re-planting workflows",
          "Out-of-fence and compliance violation reports",
          "Multi-site executive dashboards for HO teams",
        ],
      },
      {
        heading: "From pilot block to full lease area",
        paragraphs: [
          "Operators typically pilot on one disturbed block or nursery-linked plantation, then scale across the lease after field crews adopt the mobile app. We support offline capture for low-connectivity pits and stockyards.",
          "Share your lease hectares, number of active blocks, and next statutory review date — we will recommend a monitoring cadence and export set matched to your reclamation plan.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can satellite monitoring replace ground surveys?",
        answer:
          "Satellite signals guide where to send field teams; they do not replace ground truth. Aranyix combines SAR and NDVI trends with geo-tagged field surveys for defensible MRV.",
      },
      {
        question: "Do you certify mine closure or carbon offsets?",
        answer:
          "No. Aranyix is an MRV and audit-prep platform. We do not issue carbon credits or statutory closure certificates.",
      },
      {
        question: "Can we monitor plantations outside the lease boundary?",
        answer:
          "Yes. Fence and work-area geometry helps flag out-of-fence registrations and supports compliance violation reporting when plantings drift beyond approved zones.",
      },
    ],
    relatedLinks: [
      { label: "CAMPA afforestation programmes", href: "/solutions/campa-afforestation" },
      { label: "Government agency partnerships", href: "/partners/agencies" },
      { label: "Plantation MRV product", href: "/product/mrv" },
    ],
    primaryCta: { label: "Talk to reclamation team", href: "/contact" },
    secondaryCta: { label: "See product overview", href: "/product/mrv" },
  },
  {
    slug: "campa-afforestation",
    path: "/solutions/campa-afforestation",
    eyebrow: "Government programmes",
    title: "CAMPA and compensatory afforestation MRV",
    description:
      "Field-to-dashboard MRV for CAMPA, compensatory afforestation, and state greening schemes — geo-tagged plantations, survival analytics, and audit-ready scheme KPIs.",
    intro:
      "Compensatory afforestation and CAMPA-funded plantations must be traceable from nursery to block, with survival evidence that stands up to review. District and state teams juggle multiple schemes, vendors, and planting seasons — often across disconnected spreadsheets. Aranyix gives programme officers a unified registry and reporting layer aligned to Indian afforestation workflows.",
    sections: [
      {
        heading: "Scheme-aligned plantation registry",
        paragraphs: [
          "Register plantations by project, work area, species, and planting year. Field crews capture GPS and photos on Android even when connectivity is patchy. State and district dashboards roll up hectares, survival rates, and pending registrations without manual consolidation.",
          "Exports are designed for audit-prep and scheme review meetings — not as a substitute for statutory approvals Aranyix does not grant.",
        ],
      },
      {
        heading: "Officer and field-team workflows",
        paragraphs: [
          "Role-based access separates platform administrators, programme managers, and field validators. Teams see only the projects they are assigned to, while leadership gets statewide or divisional rollups.",
        ],
        bullets: [
          "District and block-wise plantation reports",
          "Species-wise and FY-wise KPI exports",
          "Pending registration and re-geotag queues",
          "Photo evidence packs for review missions",
          "Satellite health overlays for stress screening",
        ],
      },
      {
        heading: "Partnering with state implementations",
        paragraphs: [
          "Aranyix works with forest departments, PSUs, and implementation agencies on phased rollouts — training, scheme templates, and data migration from legacy registers where needed.",
          "Agencies evaluating a statewide or divisional deployment should visit our partnerships page or submit programme details through the contact form.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Aranyix approved by MOEFCC or state CAMPA authorities?",
        answer:
          "Aranyix is a software platform used by implementing agencies. Statutory approvals and fund utilisation certification remain with the competent government authority.",
      },
      {
        question: "Can we import existing plantation registers?",
        answer:
          "Yes. We support structured imports and phased cutover so historical plantations are not lost when teams move to geo-tagged MRV.",
      },
      {
        question: "Does the platform work in Hindi and regional languages?",
        answer:
          "The web dashboard and mobile app support multiple Indian languages so field teams can work in the language they are most comfortable with.",
      },
    ],
    relatedLinks: [
      { label: "Agency partnerships", href: "/partners/agencies" },
      { label: "Mining green belt monitoring", href: "/solutions/mining-greening" },
      { label: "Resources & guides", href: "/resources" },
    ],
    primaryCta: { label: "Contact programme team", href: "/contact" },
    secondaryCta: { label: "Agency partnerships", href: "/partners/agencies" },
  },
  {
    slug: "brsr-esg",
    path: "/solutions/brsr-esg",
    eyebrow: "ESG & disclosure",
    title: "BRSR and ESG plantation evidence",
    description:
      "Audit-prep plantation evidence for BRSR Principle 6 and corporate ESG disclosures — geo-tagged MRV, survival KPIs, and exportable reports from Aranyix.",
    intro:
      "ESG disclosures are only as credible as the evidence behind them. For plantation and greening commitments, sustainability teams need geo-tagged proof, survival trends, and documented methodologies — not marketing claims. Aranyix helps corporates assemble audit-prep evidence packs aligned to BRSR and broader ESG workflows while being clear we do not issue registry carbon credits.",
    sections: [
      {
        heading: "From plantation data to disclosure-ready evidence",
        paragraphs: [
          "Aranyix links each registered tree to location, species, planting date, photos, and subsequent survival checks. Programme managers filter by project, state, or financial year to produce exports that match how sustainability teams actually work through BRSR cycles.",
          "Modeled carbon estimates, where shown, are presented as indicative MRV outputs — not verified removal credits.",
        ],
      },
      {
        heading: "Framework mappings sustainability teams use",
        paragraphs: [
          "Beyond BRSR, teams reference ISO 14064-2 style worksheets, TNFD nature-related disclosures, and internal climate risk packs. Aranyix centralises plantation MRV so the same field truth feeds multiple export templates.",
        ],
        bullets: [
          "BRSR Principle 6 aligned plantation exports",
          "Geo-tagged photo and survival evidence chains",
          "Executive summaries for board ESG committees",
          "Scheme and project-level KPI rollups",
          "Role-based access for consultants and auditors (read-only)",
        ],
      },
      {
        heading: "Working with your assurance provider",
        paragraphs: [
          "We recommend engaging your auditor or assurance partner early so export formats match their evidence requests. Aranyix accelerates data collection and traceability; final assurance remains with your appointed firm.",
          "Share your reporting deadline, listed entity structure, and plantation footprint when you contact us — we will suggest a realistic pilot scope.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does Aranyix provide BRSR assurance or sign-off?",
        answer:
          "No. Aranyix supplies plantation MRV data and audit-prep exports. Statutory assurance and BRSR filing remain with your company and assurance provider.",
      },
      {
        question: "Can we export data for ISO 14064-2 worksheets?",
        answer:
          "Yes. Aranyix supports multiple framework-oriented exports that map plantation activity to worksheet-style evidence, subject to your methodology choices.",
      },
      {
        question: "Are carbon figures in exports registry-grade credits?",
        answer:
          "No. Any modeled estimates are for MRV and disclosure support only. Aranyix does not issue Verra, Gold Standard, or other registry credits.",
      },
    ],
    relatedLinks: [
      { label: "CSR plantation monitoring", href: "/solutions/csr-plantation" },
      { label: "Plantation MRV product", href: "/product/mrv" },
      { label: "Contact sales", href: "/contact" },
    ],
    primaryCta: { label: "Request ESG evidence walkthrough", href: "/contact" },
    secondaryCta: { label: "Book a demo", href: "/demo" },
  },
  {
    slug: "mrv",
    path: "/product/mrv",
    eyebrow: "Product",
    title: "Plantation MRV platform — field to orbit",
    description:
      "Aranyix plantation MRV: mobile geo-tagging, satellite NDVI and SAR fusion, survival analytics, bioacoustic biodiversity signals, and audit-prep exports for Indian programmes.",
    intro:
      "Aranyix is an environmental MRV platform built for Indian plantation programmes at scale. Teams register trees in the field, fuse satellite health signals, track survival and mortality, and export audit-prep evidence — from citizen science BYOT tagging to government-grade scheme rollouts. We are explicit about what we are not: a carbon credit registry or certification body.",
    sections: [
      {
        heading: "Core MRV capabilities",
        paragraphs: [
          "Every tree gets a geo-tagged digital passport with species, photos, and planting context. Managers configure projects, work areas, and schemes so field data rolls up cleanly to dashboards and exports.",
          "Satellite pipelines blend NDVI trends with SAR integrity signals to highlight stress before field teams arrive. Bioacoustic modules add biodiversity context where programmes invest in acoustic monitoring.",
        ],
        bullets: [
          "Android field app with offline sync",
          "Web executive dashboard and map views",
          "Survival, mortality, and re-planting workflows",
          "Satellite NDVI + SAR fusion layers",
          "Plantation, compliance, and framework exports",
        ],
      },
      {
        heading: "Who uses Aranyix",
        paragraphs: [
          "Corporate CSR and ESG teams, mining reclamation groups, forest departments, NGOs, and citizen programmes all run on the same core registry with role-based scoping. Platform administrators govern orgs, billing, and feature flags for large deployments.",
        ],
      },
      {
        heading: "Deployment and pilots",
        paragraphs: [
          "Most customers begin with a 90-day pilot across a bounded hectares band and a defined field team. We provide onboarding, species templates, and export configuration — then expand to full portfolio monitoring after crews adopt mobile registration.",
          "Explore solution-specific pages for CSR, mining, CAMPA, and BRSR workflows, or contact us with your site count and reporting needs.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is included in a 90-day pilot?",
        answer:
          "Pilots typically cover agreed hectares and sites, mobile app rollout for field teams, core MRV dashboards, and a defined export set. Exact scope is confirmed after we review your programme details.",
      },
      {
        question: "Do you integrate with existing GIS or ERP systems?",
        answer:
          "Aranyix exposes APIs and webhook patterns for enterprise integrations. Share your integration requirements when you contact us.",
      },
      {
        question: "Is Aranyix the same as Araynix?",
        answer:
          "Yes. Aranyix is the product brand; Araynix is an alternate name used in some materials. Both refer to the same MRV platform from Axentis Technologies.",
      },
    ],
    relatedLinks: [
      { label: "CSR plantations", href: "/solutions/csr-plantation" },
      { label: "Mining green belts", href: "/solutions/mining-greening" },
      { label: "Request a demo", href: "/demo" },
    ],
    primaryCta: { label: "Start a pilot conversation", href: "/contact" },
    secondaryCta: { label: "Create free account", href: "/auth?mode=signup" },
  },
  {
    slug: "agencies",
    path: "/partners/agencies",
    eyebrow: "Partnerships",
    title: "Government and agency partnerships",
    description:
      "Partner with Aranyix for statewide plantation MRV — implementation support, training, scheme templates, and audit-prep reporting for Indian forest and greening agencies.",
    intro:
      "State forest departments, PSUs, and programme management units need software that respects hierarchical governance, low-connectivity field realities, and audit trails that survive officer transfers. Aranyix partners with agencies on phased deployments — from divisional pilots to statewide registries — without over-promising statutory outcomes the platform cannot deliver.",
    sections: [
      {
        heading: "How agency partnerships work",
        paragraphs: [
          "We start with a joint scoping workshop: schemes in scope, hectares bands, field team size, legacy data sources, and reporting calendars. Implementation includes training, mobile provisioning, and export templates aligned to your review missions.",
          "Dedicated programme success support helps adoption through planting seasons — when registration volume and survival checks peak.",
        ],
      },
      {
        heading: "Technical and governance fit",
        paragraphs: [
          "Role-based access mirrors division, district, and project boundaries. Audit logs and evidence exports support transparency requests without handing every user statewide visibility.",
        ],
        bullets: [
          "Hierarchical org and project scoping",
          "Offline-first mobile capture for field crews",
          "District and block rollup dashboards",
          "Scheme templates (CAMPA, CSR, mining reclamation)",
          "Training and handover documentation",
        ],
      },
      {
        heading: "Procurement and rollout",
        paragraphs: [
          "Agencies typically procure through existing IT or environmental MIS channels. We provide technical documentation, data residency context, and pilot success criteria before statewide expansion.",
          "Contact us with your agency name, states in scope, and target planting season — we will schedule a technical briefing with your programme leadership.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does Aranyix host data in India?",
        answer:
          "Deployment architecture and data residency options are discussed during procurement. Share your hosting requirements in the contact form and we will provide current deployment details.",
      },
      {
        question: "Can multiple states run on one platform instance?",
        answer:
          "Yes. Organisations are isolated with strict role-based scoping so each agency sees only its programmes and users.",
      },
      {
        question: "Do you replace existing forest MIS systems?",
        answer:
          "Aranyix can integrate with or phase alongside legacy systems. Many agencies run pilots in parallel before committing to a full registry migration.",
      },
    ],
    relatedLinks: [
      { label: "CAMPA afforestation", href: "/solutions/campa-afforestation" },
      { label: "Mining green belts", href: "/solutions/mining-greening" },
      { label: "Resources", href: "/resources" },
    ],
    primaryCta: { label: "Schedule agency briefing", href: "/contact" },
    secondaryCta: { label: "View product MRV", href: "/product/mrv" },
  },
  {
    slug: "resources",
    path: "/resources",
    eyebrow: "Resources",
    title: "Plantation MRV guides and solution library",
    description:
      "Guides to plantation MRV, CSR greening, mining reclamation, CAMPA programmes, and BRSR evidence — plus links to Aranyix product demos and contact.",
    intro:
      "Whether you are scoping a CSR pilot, a mining green belt review, or a statewide afforestation registry, the same MRV principles apply: geo-tagged truth, survival over time, and evidence that auditors can follow. This resource hub links to Aranyix solution pages and practical next steps for Indian plantation programmes.",
    sections: [
      {
        heading: "Solution guides",
        paragraphs: [
          "Each guide explains who the workflow is for, what evidence to collect, and how Aranyix supports audit-prep reporting — with clear limits on what the software does not certify or issue.",
        ],
        bullets: [
          "CSR plantation monitoring — /solutions/csr-plantation",
          "Mining green belt MRV — /solutions/mining-greening",
          "CAMPA & compensatory afforestation — /solutions/campa-afforestation",
          "BRSR & ESG plantation evidence — /solutions/brsr-esg",
          "Plantation MRV product overview — /product/mrv",
        ],
      },
      {
        heading: "Getting started",
        paragraphs: [
          "New to Aranyix? Create a free account to explore the dashboard, or book a demo walkthrough with our team. For large programmes, submit the contact form with hectares, site count, and reporting deadlines so we can recommend a pilot scope.",
          "Developers and integrators can request API documentation through the same contact channel.",
        ],
      },
      {
        heading: "Honest positioning",
        paragraphs: [
          "Aranyix helps teams measure and report plantation activity with rigor. We do not replace statutory forest approvals, issue carbon credits, or sign BRSR assurance. Our role is MRV software and audit-prep evidence — so your teams and auditors can work from a shared, geo-tagged source of truth.",
        ],
      },
    ],
    faqs: [
      {
        question: "Where is the best place to start?",
        answer:
          "Match your role to a solution page: CSR teams start at CSR plantation monitoring; mining reclamation teams at mining green belts; agencies at government partnerships.",
      },
      {
        question: "Is there public API documentation?",
        answer:
          "API and webhook documentation is available on request for enterprise and agency deployments. Contact us with your integration use case.",
      },
      {
        question: "Can I try the product without a sales call?",
        answer:
          "Yes. Sign up for a free account or request a guided demo if you prefer a live walkthrough with your programme context.",
      },
    ],
    relatedLinks: [
      { label: "Book a demo", href: "/demo" },
      { label: "Contact us", href: "/contact" },
      { label: "Sign up free", href: "/auth?mode=signup" },
    ],
    primaryCta: { label: "Contact our team", href: "/contact" },
    secondaryCta: { label: "Explore product MRV", href: "/product/mrv" },
  },
  {
    slug: "demo",
    path: "/demo",
    eyebrow: "Demo",
    title: "Request an Aranyix product demo",
    description:
      "Book a live Aranyix demo — plantation MRV, satellite health, survival tracking, and audit-prep exports tailored to your CSR, mining, or government programme.",
    intro:
      "See how Aranyix connects mobile field registration, satellite fusion, and audit-prep exports in one walkthrough. Demos are tailored to your programme type — CSR plantations, mining green belts, CAMPA schemes, or corporate ESG evidence — so you spend time on workflows that matter to your team.",
    sections: [
      {
        heading: "What we cover in a demo",
        paragraphs: [
          "A typical session walks through tree registration on mobile, project dashboards, satellite health layers, survival workflows, and sample exports. We leave time for your questions on rollout, training, and integration.",
        ],
        bullets: [
          "Field app geo-tagging and offline sync",
          "Executive dashboard and map views",
          "Satellite NDVI and SAR stress signals",
          "Plantation and compliance report samples",
          "Pilot scoping and pricing conversation",
        ],
      },
      {
        heading: "Who should attend",
        paragraphs: [
          "Invite sustainability leads, reclamation managers, programme officers, and IT stakeholders who will own rollout decisions. Demos are conducted in English; Hindi support is available for field rollout planning.",
        ],
      },
      {
        heading: "Next step",
        paragraphs: [
          "Submit the contact form with your preferred dates, programme type, and hectares or site count. We confirm the session within two business days. Prefer to explore solo? Create a free account and navigate the dashboard at your own pace.",
        ],
      },
    ],
    faqs: [
      {
        question: "How long is a demo?",
        answer:
          "Most demos run 45–60 minutes including Q&A. Complex multi-state programmes may schedule a follow-up technical session.",
      },
      {
        question: "Is the demo a commitment to purchase?",
        answer:
          "No. Demos are educational. Many teams continue with a bounded 90-day pilot before enterprise rollout.",
      },
      {
        question: "Can we see our own sites on the map during the demo?",
        answer:
          "If you share boundary files or coordinates in advance, we can often configure a pilot project overlay for the session.",
      },
    ],
    relatedLinks: [
      { label: "Contact form", href: "/contact" },
      { label: "Product MRV overview", href: "/product/mrv" },
      { label: "CSR solution", href: "/solutions/csr-plantation" },
    ],
    primaryCta: { label: "Book via contact form", href: "/contact" },
    secondaryCta: { label: "Sign up free", href: "/auth?mode=signup" },
  },
];

export const SOLUTION_PAGE_MAP = new Map(SOLUTION_PAGES.map((page) => [page.path, page]));

export function getSolutionPage(path: string): SolutionPage | undefined {
  return SOLUTION_PAGE_MAP.get(path);
}

export const MONEY_PAGE_PATHS = SOLUTION_PAGES.map((page) => page.path);
