# Araynix / Aranyix — Investor & Sales Deck Source Material

> **For designer:** Modern enterprise ClimateTech deck. Authoritative, evidence-driven — not playful.
>
> **Palette:** deep forest green `#14532d` · accent green `#16a34a` · warm stone neutrals · amber `#d97706` (warnings/caveats) · sky blue `#0ea5e9` (satellite/data)
>
> **Visual style:** geospatial dashboards, plantation maps, audit pipelines, infographic cards. Icon per capability. No generic handshake stock photography.
>
> **Audience & commercial framing (shapes every slide):**
> - **Primary buyers:** mining companies (Environment / CSR / ESG) and CSR-event / experiential agencies
> - **Secondary:** corporate ESG teams (listed companies, supplier programmes)
> - **Government is not the lead story** — mention only where it strengthens mining/CSR credibility (e.g. scheme-aligned evidence)
> - **Commercial offer:** **Plant → Track → Report** — coordinated plantation for CSR/events & mine greening, continuous MRV in-platform, regular plantation reports for boards and auditors
> - **Honesty line:** audit-ready / readiness — never claim Verra/Gold Standard certification, registry issuance, or “we issue credits”

---

## Slide sequence (14 core slides)

### Slide 1 — Araynix positioning
- **Purpose:** Establish brand, category, and the Plant → Track → Report promise in one frame.
- **Headline:** Araynix — Plant. Track. Report.
- **Subhead:** Audit-ready MRV for mine greening, CSR plantations, and experiential greening drives
- **Bullets:**
  - One platform from geotagged sapling to signed evidence bundle — web, mobile, API, and automated monitoring workers
  - Built for **mining reclamation** and **CSR plantation programmes** that must survive board review, not just photo ops
  - Indian scheme depth (CAMPA, Green Credit, mining reclamation) plus international audit-prep frameworks (VM0047, BRSR, TNFD exports)
  - Continuous satellite + SAR monitoring — scheduled jobs, not one-off consultant PDFs
  - Biodiversity evidence via field bioacoustics (BirdNET + ecoacoustic indices) where sites need ecosystem proof
  - **Estimate / audit-ready** — supports third-party review; does not replace certification or registry issuance
- **Infographic / layout:** Full-bleed canopy/satellite hybrid hero; logo top-left; three pill badges below headline: **Plant** · **Track** · **Report**
- **Icons:** seedling, map pin, document-check, satellite dish
- **Speaker notes:** Araynix is the evidence layer for plantations that matter to mining CSR and experiential agencies. We are not selling a vanity tree counter — we sell defensible proof that trees were planted, survived, and can be reported to ESG and closure stakeholders. Lead with outcomes: fewer audit scrambles, continuous monitoring, exportable reports.
- **Screenshot / asset needed:** Branded logo + hero composite (forest canopy + NDVI heatmap overlay); optional `frontend/public/deck/` style treatment
- **Source in repo:** `docs/PRESENTATION_PROMPT.md`, `docs/ARCHITECTURE.md`, `backend/app/services/onboarding/audience_presets.py`

---

### Slide 2 — The problem
- **Purpose:** Name the pain mining and CSR buyers already feel before introducing the product.
- **Headline:** Plantation claims collapse under audit
- **Subhead:** CSR photo-ops without survival proof are a reputational liability
- **Bullets:**
  - Tree counts live in spreadsheets; photos in WhatsApp; GPS missing or unverifiable when auditors ask
  - Mine green belts and dump rehabilitation lack **continuous** satellite proof — consultant reports go stale after the monsoon
  - Survival, re-geotag, and compliance evidence assembled manually weeks before board or closure reviews
  - Carbon figures presented as single points — no uncertainty range, mortality adjustment, or buffer discipline
  - No tamper-evident trail — stakeholders cannot prove records were not edited after the event
  - CSR events deliver a moment; **no system** ties that moment to 12–36 months of proof for the sponsor
- **Infographic / layout:** Split **before / after** — left: messy spreadsheet + chat screenshots + faded event photo; right: clean dashboard with map, survival KPI, alert badge
- **Icons:** broken chain, spreadsheet, camera-flash, warning triangle
- **Speaker notes:** Mining environment heads know progressive closure and green-belt commitments outlive the planting day. CSR agencies know sponsors increasingly ask “what happened to our trees?” six months later. This slide sets up why a platform — not another plantation vendor with a PDF — is the answer.
- **Screenshot / asset needed:** Capture from portal: `/dashboard` or `/portfolio-health` showing alerts + KPIs vs placeholder “spreadsheet” graphic
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 2), `backend/app/services/onboarding/audience_presets.py` (`mining`, `corporate_esg`)

---

### Slide 3 — Solution in one line
- **Purpose:** Compress the value prop into a memorable pipeline buyers can repeat internally.
- **Headline:** Plant → Track → Report
- **Subhead:** From event-day sapling to board-ready plantation evidence
- **Bullets:**
  - **Plant** — geotagged registration with photos, species, work-area polygons, and scheme-aware planting templates (mining reclamation, industrial greenbelt, urban forest)
  - **Track** — offline mobile capture, survival surveys, monthly satellite NDVI sweeps, SAR integrity watch, alerts, and compliance violation tracking
  - **Report** — 16+ plantation operational reports, framework exports (BRSR P6, ESG), and signed ZIP evidence bundles
  - Each registration and export can write to a **hash-chained audit log** with optional daily root publication
  - Estate Watch adds a structured **audit pipeline** (intake → satellite → confidence → field sampling → signed export) for existing cover and large estates
  - Same user account and API whether the buyer is a mine, CSR agency, or corporate sponsor [VERIFY: cross-subdomain SSO if store subdomain is used later]
- **Infographic / layout:** Horizontal 3-stage pipeline with sub-steps under each stage; amber “Estimate” chip on Report outputs
- **Icons:** shovel+GPS, radar/satellite, file-archive
- **Speaker notes:** This is the SKU story. Plant is the event or site day. Track is everything that wins the audit — GPS, photos, survival, satellite. Report is what goes to the CSR committee, ESG lead, or closure planner. Emphasize we sell the full loop, not tracking-only (though track-only can follow for mature clients).
- **Screenshot / asset needed:** Composite diagram; optional capture from `/projects/{id}` overview showing project lifecycle
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 3), `backend/app/services/evidence/bundle.py`, `frontend/messages/en.json` (`auditRoadmap`)

---

### Slide 4 — Who we sell to
- **Purpose:** Make primary buyers and their internal champions explicit.
- **Headline:** Built for mining CSR and the agencies that run their greening drives
- **Subhead:** Secondary: corporate ESG and supplier geo-MRV programmes
- **Bullets:**
  - **Mining — Environment Manager / Mine Closure Planner:** progressive closure phases, overburden dumps, green-belt strips, native species rules, 30-day satellite cadence targets
  - **Mining — CSR & ESG Head:** board-ready plantation reports, BRSR Principle 6 export prep, portfolio health dashboards
  - **CSR / experiential agencies — Account Director / Sustainability Producer:** bulk mobile registration on event day, photo evidence manifests, sponsor-branded report packs
  - **Corporate ESG (secondary) — VP Sustainability / CSR Committee:** supplier geo due diligence, internal credit ledger discipline (not external issuance)
  - Onboarding **audience presets** route mining buyers to `mining_reclamation`, `green_credit_india`, and `estate_monitoring` schemes automatically
  - Government forest/NHAI workflows exist in-platform but are **not** the lead pitch for this deck
- **Infographic / layout:** Two primary columns (Mining · CSR agencies) with buyer titles as chips; smaller third column “Corporate ESG”; arrows into shared “Araynix platform” hub
- **Icons:** hard-hat+leaf, megaphone+tree, building-ESG
- **Speaker notes:** Lead with mining because reclamation and CSR budgets are large, audit pressure is real, and the product has a dedicated `mining_reclamation` scheme and template. CSR agencies are the delivery partner — they run the event; Araynix is how they prove delivery to the sponsor. Corporate ESG is upsell when the mine’s parent company wants group-level BRSR evidence.
- **Screenshot / asset needed:** Capture from portal: onboarding audience picker or project create with `mining_reclamation` scheme selected
- **Source in repo:** `backend/app/services/onboarding/audience_presets.py`, `backend/app/services/onboarding/audience.py`, `backend/app/services/schemes/registry.py` (`mining_reclamation`)

---

### Slide 5 — Offer packages / SKUs
- **Purpose:** Present commercial packages mapped to platform capabilities (sales packaging).
- **Headline:** Three ways to buy the loop
- **Subhead:** Full-service planting plus platform; platform-first for mature programmes
- **Bullets:**
  - **CSR Event Pack** — single-site or multi-city greening drive: pre-event project setup, event-day mobile registration (GPS + photos), 12-month survival + satellite watch, quarterly plantation report pack for the sponsor [VERIFY: physical planting execution — services layer; platform supports registration, monitoring, and reports]
  - **Mining Greening Retainer** — annual programme across dumps, buffers, and haul roads: `mining_reclamation` scheme, progressive closure phase tracking, monthly NDVI + SAR sweeps, compliance checklists, evidence bundle per closure milestone
  - **Track + Report Add-on** — for clients who already plant with their own contractors: import boundaries/KML, enable satellite watch, survival surveys, plantation reports, and signed evidence exports
  - **Track-only (later SKU)** — self-serve MRV subscription for estates with existing field teams; AI scan metering via Razorpay packs (`byot_ai_5`, `byot_ai_20`) where applicable
  - All packages share one org, role-based access (field worker, compliance lead, executive), and the same API
  - Outputs always labelled **estimate / audit-ready** — not certified credits
- **Infographic / layout:** Three pricing-style cards (Event Pack · Mining Retainer · Track+Report) with “Most popular” on Mining Retainer; footnote amber box for honesty disclaimer
- **Icons:** calendar-event, factory/mountain, line-chart
- **Speaker notes:** These are commercial bundles, not separate products in code. The platform is one; packaging matches how buyers procure — event-led CSR vs multi-year mine greening vs MRV-only. Be explicit that planting execution may be delivered by Aranyix field partners or the client’s contractors; the platform is what makes either path auditable.
- **Screenshot / asset needed:** None required — use designed SKU cards; optional `frontend/components/presentation/deck-slides.tsx` mining/corporate slides as visual reference
- **Source in repo:** `backend/app/services/payments/catalog.py` [VERIFY: SKU names/pricing not in repo], `backend/app/services/schemes/registry.py`, `docs/PRESENTATION_PROMPT.md` (Optional pricing slide)

---

### Slide 6 — Platform at a glance
- **Purpose:** Show technical breadth without losing the business buyer.
- **Headline:** Four surfaces, one source of truth
- **Subhead:** PostGIS geospatial core · S3-compatible media · role-based access control
- **Bullets:**
  - **Web dashboard (Next.js)** — executives, compliance leads, auditors: projects, maps, monitoring, reports, Estate Watch
  - **Mobile field app (Flutter, offline-first)** — GPS tree registration, photo upload queues, bioacoustic capture, survival surveys, sync queue
  - **API + geospatial (FastAPI + PostGIS)** — REST, webhooks, STAC/GeoJSON exports, integration for agency CRM/ERP
  - **Automation workers (Celery)** — monthly satellite sweep, monthly SAR sweep, weekly SAR integrity watch, daily health roundup, threat watch, compliance deadline scan, daily audit root publish
  - Production domains: `aranyix.tech` + `api.aranyix.tech`; same-origin `/api` via Caddy reverse proxy
  - Org feature flags gate modules: `ai_scan`, `satellite`, `bioacoustic`, `reports`, `payments`
- **Infographic / layout:** Four-column architecture diagram with data flowing into central Postgres/PostGIS cylinder; sky-blue accent on worker/automation row
- **Icons:** monitor, smartphone, api-plug, gears/cron
- **Speaker notes:** This slide reassures CTOs and procurement that this is enterprise software, not a slide deck company. Emphasize offline mobile for remote mine sites and patchy event-day connectivity. Celery beat schedule is the “always-on monitoring” story.
- **Screenshot / asset needed:** Capture from portal: `/monitoring` job history panel; mobile home screen (field ops)
- **Source in repo:** `docs/ARCHITECTURE.md`, `docs/PHASE3_MONITORING.md`, `backend/app/workers/celery_app.py`, `infrastructure/hostinger/Caddyfile`, `backend/app/services/platform/governance.py`

---

### Slide 7 — Field planting & registration
- **Purpose:** Show what happens on CSR event day or mine planting week.
- **Headline:** Field data that survives an audit
- **Subhead:** Offline-first mobile — sync when the signal returns
- **Bullets:**
  - GPS-tagged tree registration with photos, species, planting program, and optional chainage (highway/mining corridors)
  - **Work-area polygons (geofences)** with hectare totals — spatial unit of record for satellite scans and KPIs
  - Scheme-aware **planting templates** encode spacing, density, native species %, and pit rules (e.g. `mining_reclamation_v1`: 400–1,200 trees/ha green belt, 80% native minimum)
  - Append-only **measurement time series** — DBH, height, canopy — method and instrument captured per reading
  - **Survival surveys** — alive / dead / removed / stressed with cause codes; automated reminders (daily 06:00 UTC Celery job)
  - Offline queues for trees, bioacoustic, audit, and survival — mobile sync queue with per-item status [VERIFY: exact queue count on current mobile build]
- **Infographic / layout:** Mobile mock left (wizard steps: GPS → photos → species → review); map right with polygon + tree pins; callout for “Save & Next” bulk registration flow
- **Icons:** crosshair-GPS, camera, ruler, cloud-off+sync
- **Speaker notes:** For CSR agencies, the story is speed on event day without losing audit quality — every tree gets coordinates and photos before the crowd leaves. For mining, templates enforce reclamation rules so environment teams don’t discover non-compliant spacing at inspection.
- **Screenshot / asset needed:** Capture from mobile: Add Tree wizard GPS step; capture from portal: `/map` with work-area polygon and tree pins
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 5), `docs/PHASE2_FIELD_OPERATIONS.md`, `mobile/docs/mobile-launch-audit.md`, `backend/app/services/planting_projects/templates.py` (`mining_reclamation_v1`), `backend/app/workers/celery_app.py` (`survival_survey_reminders`)

---

### Slide 8 — Continuous monitoring
- **Purpose:** Differentiate from one-off satellite studies and justify ongoing retainer pricing.
- **Headline:** Monitoring is scheduled, not requested
- **Subhead:** Optical NDVI + SAR integrity — see through cloud and monsoon gaps
- **Bullets:**
  - **Monthly optical sweep** (1st of month, 02:00 UTC) — Sentinel-2 NDVI/EVI per work area; alert when NDVI drops ≥0.15 vs baseline
  - **Monthly SAR sweep** (5th of month) + **weekly SAR integrity watch** — Sentinel-1 C-band via GEE or Sentinel Hub; Forest Integrity Score 0–100 with letter grade
  - **Daily health roundup** (03:00 UTC) — poor-health trees, stale analyses, failed presence checks; compliance violations escalated after 7 days open
  - **Threat watch** (05:30 UTC) — weather + pest intel + composite site risk; in-app/email/push per user preferences
  - **Satellite health AI** — rule-based NDVI decline analysis with optional plain-language narrative; results persist as health analysis records
  - **ISRO Bhoonidhi** STAC search integrated for fusion status across Indian EO collections [VERIFY: live vs demo depends on credentials]
  - Caption for deck: live SAR is **Sentinel-1 C-band**; L/S-band analytics are NISAR-**inspired**, not live NISAR feed
- **Infographic / layout:** Calendar/timeline of automated jobs (monthly optical, monthly SAR, weekly SAR, daily digest) above a monitoring dashboard strip; side-by-side cloudy optical vs clear SAR panel
- **Icons:** satellite, cloud-rain, bell-alert, heart-pulse
- **Speaker notes:** Mining buyers care about monsoon blind spots — SAR is the proof point. CSR sponsors care that someone is watching after the press release. Tie scheduled jobs to the Mining Greening Retainer SKU.
- **Screenshot / asset needed:** Capture from portal: `/monitoring` (stale scans, job runs); `/satellite` NDVI chart; SAR integrity gauge on project/work-area view
- **Source in repo:** `docs/PHASE3_MONITORING.md`, `docs/SATELLITE_MONITORING.md`, `docs/SAR_OPERATIONS.md`, `backend/app/workers/celery_app.py`, `docs/HAZARD_WATCH.md`, `docs/PHASE4_INTELLIGENCE.md`

---

### Slide 9 — Plantation audit & Indian programme coverage
- **Purpose:** Prove scheme depth for mining/CSR credibility without leading with government sales.
- **Headline:** Scheme-native compliance — from mine reclamation to CSR green credit
- **Subhead:** 13 central/state schemes · 20 guided checklists · Estate Watch audit pipeline
- **Bullets:**
  - **Mining reclamation** (`mining_reclamation`) — MoM/IBM metadata, progressive closure phases (dump stabilization → greenbelt → ecorestoration → final closure), block types (overburden dump, pit wall, buffer zone, tailings pond)
  - **Corporate CSR / ESG** — `green_credit_india` calculator (MoEFCC rules; ICFRE verification field only), `estate_monitoring` for post-planting watch without full tree census
  - **Estate Watch** — audit intake (claim register, KML boundaries, GIS/plausibility, frozen SHA-256 snapshots) → satellite T0–T4 timeline → confidence map → risk scan → field sampling → signed audit bundle → attestation
  - **Additional schemes in registry:** CAMPA, GIM, MISHTI, Nagar Van, NHAI highway, MGNREGA convergence, Jal Shakti riparian, Sahakar Van, DFI green corridor, Rajasthan Amrit Poshan Vatika
  - **20 compliance checklists** including `mining_reclamation`, `esg_general`, `verra_vm0047`, `green_credit_india`, `eudr_supplier_mrv`, `estate_monitoring` — auto-signals tick items from live platform data
  - **Rule engine** enforces planting standards (spacing, pit size, species mix, density) per template; violations tracked with deadlines
- **Infographic / layout:** Table — Scheme | Buyer relevance | Platform provides; highlight rows for `mining_reclamation`, `green_credit_india`, `estate_monitoring`; secondary strip for Estate Watch 7-phase pipeline
- **Icons:** clipboard-check, map-boundary, shield-audit
- **Speaker notes:** Mining slide: reclamation scheme is the hook. CSR agencies: green credit and ESG general checklists support sponsor reporting. Estate Watch is the upsell when the client already has cover and needs audit-grade satellite workflow — not mandatory for every event pack.
- **Screenshot / asset needed:** Capture from portal: Estate Watch audit intake (`/projects/.../audit-intake`); compliance checklist with auto-ticked items; scheme picker on project create
- **Source in repo:** `backend/app/services/schemes/registry.py`, `docs/CENTRAL_SCHEME_INTEGRATION.md`, `backend/app/services/compliance/checklists.py`, `frontend/messages/en.json` (`auditIntake`, `auditRoadmap`), `backend/app/api/v1/audit_engagements.py`

---

### Slide 10 — Carbon & reporting
- **Purpose:** Show honest quantification and the reporting outputs sponsors and boards actually receive.
- **Headline:** A range, not a marketing number — plus reports your CFO can file prep
- **Subhead:** Regular plantation reports for operations; framework exports for disclosure prep
- **Bullets:**
  - **Carbon engine** — IPCC AR6, Verra VM0047, Gold Standard LUF methodologies; species allometrics + Chave 2014; Monte Carlo **90% confidence interval** on CO₂e figures
  - **Dynamic permanence buffer 10–30%** from NPRT risk assessment (not a single hardcoded discount)
  - **Mortality-adjusted** lifetime estimates; VM0047 baseline/additionality/leakage accounting endpoints for verifier prep
  - **Internal credit ledger** with serial numbers and lifecycle states (estimated → verified → buffered → issued) — disclaimer: **not external registry issuance**
  - **16 plantation report endpoints** — project-wise, FY-wise, survival/mortality, re-geotag, species-wise, work-area/site, compliance violations, satellite health, scheme KPI, carbon stock, photo evidence, field team performance, district rollup, and more
  - **SEBI BRSR Core Principle 6** export (Excel/JSON assurance pack) — export for assurance prep, not filing with SEBI
  - **12 framework report profiles** — IPCC AR6, VM0047, Gold Standard LUF, REDD+, Paris NDC, NGT/CAMPA, ESG general, GIM, MISHTI, Nagar Van, Green Credit, Sahakar Van
- **Infographic / layout:** Left — CO₂e range bar with lower/upper 90% band + buffer slice; right — grid of report export cards (Plantation reports · BRSR · Evidence ZIP)
- **Icons:** co2-molecule, bar-chart-range, file-spreadsheet
- **Speaker notes:** Never let carbon dominate the mining/CSR story — lead with survival and satellite. When carbon comes up, show the range and buffer immediately. BRSR and plantation reports are the corporate buyer hooks. Internal ledger is for traceability and double-counting prevention, not a sales claim.
- **Screenshot / asset needed:** Capture from portal: `/plantation-reports` nav + one report view; carbon summary with CI band; BRSR export download dialog
- **Source in repo:** `docs/CARBON_ENGINE.md`, `backend/app/services/carbon/uncertainty.py`, `backend/app/services/carbon/buffer.py`, `backend/app/api/v1/plantation_reports.py`, `backend/app/services/reports/brsr.py`, `backend/app/services/reports/frameworks.py`, `backend/app/services/credits/ledger.py`

---

### Slide 11 — Trust — audit trail & signed evidence
- **Purpose:** Close the trust gap for procurement and external auditors.
- **Headline:** Tamper-evident by construction
- **Subhead:** Give auditors read access without edit rights
- **Bullets:**
  - **SHA-256 hash-chained audit log** — `prev_hash` / `record_hash` on every recorded action; chain verification endpoint for independent checks
  - **Daily audit root publish** to object storage (00:05 UTC Celery job) for external transparency
  - **Evidence bundle (ZIP)** per project — manifest with per-file SHA-256, `mrv-context.json`, compliance PDF, carbon summary, scheme KPIs, photo manifest (up to 50 photos), optional integrity fusion export
  - **Ed25519 detached signature** on evidence ZIP when `EVIDENCE_SIGNING_KEY` configured; digest in response headers
  - **RFC 3161 trusted timestamping** supported when `EVIDENCE_TSA_URL` is configured [VERIFY: production TSA vendor may not be contracted yet — see `docs/LAUNCH_GATES.md`]
  - **Verifier role** — stratified sampling, per-item attestation with cryptographic hash, PDF sample audit report; Estate Watch **attestation sign** endpoint for engagement-level sign-off
  - Webhook event `project.evidence_bundle.generated` for integration with client GRC systems
- **Infographic / layout:** Chain-link diagram left → bundle contents list right; verifier “attest-only” badge vs admin “edit” crossed out
- **Icons:** link-chain, lock-signature, user-check
- **Speaker notes:** This is the “why not spreadsheets” killer for risk committees. The bundle is what you hand to a third-party reviewer. Be precise: signing and TSA are supported in software but require production key configuration.
- **Screenshot / asset needed:** Capture from portal: evidence bundle download on project page; Estate Watch attestation screen; optional audit log export
- **Source in repo:** `backend/alembic/versions/0041_audit_evidence_chain.py`, `backend/app/services/evidence/bundle.py`, `backend/app/services/evidence/signing.py`, `backend/app/workers/celery_app.py` (`daily-audit-root-publish`), `frontend/messages/en.json` (`auditRoadmap.steps.attestation`), `docs/LAUNCH_GATES.md`

---

### Slide 12 — Why Araynix vs alternatives
- **Purpose:** Position against spreadsheets, one-off consultants, and photo-only CSR vendors.
- **Headline:** The only stack that closes the Plant → Track → Report loop
- **Bullets:**
  - **vs spreadsheets / WhatsApp** — per-tree GPS, hash-chained audit log, role-based access, no manual assembly before deadline
  - **vs one-off satellite consultants** — scheduled monthly optical + SAR sweeps, alert deduplication, job-run traceability — monitoring continues after the report PDF
  - **vs photo-only CSR vendors** — survival surveys, re-geotag reports, compliance violations, scheme KPIs, signed evidence bundle — not just event photography
  - **vs generic carbon/MRV tools** — India scheme registry (13 schemes), mining reclamation template, CAMPA/Green Credit/Nagar Van checklists, BRSR P6 export
  - **vs point biodiversity apps** — integrated bioacoustics (BirdNET, ecoacoustic indices, IUCN enrichment) tied to work areas and NDVI correlation
  - **Unique combination** — field offline capture + continuous satellite/SAR + biodiversity + honest carbon ranges + signed exports in one tenant
- **Infographic / layout:** Comparison table — Capability | Spreadsheets | Consultant PDF | Photo CSR | Araynix (tick column); highlight rows: continuous monitoring, survival proof, scheme compliance, signed bundle
- **Icons:** x-circle, pdf-file, camera, check-circle
- **Speaker notes:** Do not trash competitors by name. Photo CSR is the emotional competitor for agencies — acknowledge they deliver great events, then show the 12-month proof gap Araynix fills. Consultants are the incumbent for mines — show total cost of one-off studies vs always-on platform.
- **Screenshot / asset needed:** None required — comparison table graphic; optional split screenshot montage from slides 7–11
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 25), `frontend/components/presentation/institutional-infographics.tsx`, `docs/CENTRAL_SCHEME_INTEGRATION.md`

---

### Slide 13 — Pilot / engagement model
- **Purpose:** De-risk the first contract with a concrete 90-day path using real platform workflows.
- **Headline:** Prove it on one site in 90 days
- **Subhead:** Recommended pilot structure — commercial packaging [VERIFY: not a fixed product SKU in code]
- **Bullets:**
  - **Weeks 1–2 — Scope & setup:** audience preset (`mining` or `corporate_esg`), create `PlantingProject` with scheme (`mining_reclamation` or industrial greenbelt), draw work-area polygons, configure compliance checklist and survival cadence
  - **Weeks 3–4 — Plant & register:** event-day or site-week mobile registration (GPS + photos); optional KML import for existing blocks; rule-engine validation for spacing/density
  - **Weeks 5–8 — Track:** first monthly satellite sweep + on-demand `POST .../satellite-scan`; SAR integrity baseline; survival survey round 1; threat watch alerts configured
  - **Weeks 9–12 — Report:** plantation reports pack (survival/mortality, satellite health, scheme KPI, photo evidence); framework export (ESG general or BRSR if corporate); **signed evidence bundle** download; pilot readout workshop
  - **Estate Watch option** for existing cover: complete audit intake → T0 baseline → confidence map instead of full tree census
  - **Success metrics:** ≥90% geo-tagged trees, survival survey completed, ≥1 satellite scan per work area, 0 blocking compliance violations, evidence bundle generated
  - Pilot scope typically 1–3 work areas, 500–5,000 trees [VERIFY: commercial sizing — adjust per contract]
- **Infographic / layout:** 90-day Gantt / phase swimlane — Setup · Plant · Track · Report — with deliverable icons at week 12
- **Icons:** calendar-90, flag-checkered, package-deliver
- **Speaker notes:** This slide makes procurement easy. Emphasize the deliverable at day 90 is a signed evidence bundle and report pack the sponsor can show their board — not “we’ll get back to you.” Adjust tree counts for CSR events vs mine green belts.
- **Screenshot / asset needed:** Capture from portal: project timeline or monitoring summary showing first scan completed; evidence bundle download confirmation
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 26 CTA/pilot bullet), `docs/PHASE3_MONITORING.md`, `backend/app/api/v1/planting_projects.py` (`satellite-scan`, `evidence-bundle`), `docs/SAR_OPERATIONS.md` (pilot calibration note)

---

### Slide 14 — Call to action
- **Purpose:** Single clear next step for mining and agency buyers.
- **Headline:** See your plantation — planted, tracked, and report-ready
- **Subhead:** Start with one CSR event or one reclamation block
- **Bullets:**
  - Book a **90-day pilot** on one project: register trees, run a satellite sweep, export an evidence bundle
  - **Compliance mapping workshop** — align your scheme portfolio (mining reclamation, green credit, estate watch) to checklists and report profiles
  - **Integration review** — API, webhooks, and evidence exports into your ESG / GRC / GIS stack
  - **Agency partnership** — white-label reporting for CSR sponsors [VERIFY: partner commercial terms not in repo]
  - Contact / QR placeholder — production domain `aranyix.tech`
  - Closing line: **“Araynix — evidence you can hand to an auditor, a board, or a sponsor.”**
- **Infographic / layout:** CTA card center with three buttons (Pilot · Workshop · Demo); QR to demo login or public tree verification page `/p/{code}`; forest-green background
- **Icons:** rocket, handshake-minimal (line icon only — not stock photo), mail
- **Speaker notes:** Ask which they need first — a mine reclamation block or a upcoming CSR event. Offer to run a live satellite scan on their polygon during the demo if coordinates are available.
- **Screenshot / asset needed:** Public verification page `aranyix.tech/p/{code}` if demo tree exists; dashboard hero for background blur
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 26), `backend/app/services/public_verification/builder.py`

---

## Optional appendix slides (use only if audience asks)

### Appendix A — Biodiversity & bioacoustics
- **Purpose:** Deep-dive differentiator for restoration-heavy mine sites or CSR “forest comeback” narratives.
- **Headline:** Prove the ecosystem signal, not just the tree count
- **Bullets:** Field audio from mobile with offline queue; BirdNET species ID + multi-taxa detection; ecoacoustic indices (ACI, ADI, AEI, Bioacoustic Index, NDSI); Shannon/Simpson diversity; Biodiversity Health Score; IUCN Red List enrichment; NDVI–bioacoustic correlation; weekly biodiversity baseline Celery job
- **Source in repo:** `docs/PRESENTATION_PROMPT.md` (Slide 12), `backend/app/services/bioacoustic/`, `backend/app/workers/celery_app.py` (`biodiversity-baseline`)

### Appendix B — AI assistant & executive briefs
- **Purpose:** Show intelligence layer for portfolio Q&A without overselling autonomy.
- **Bullets:** Portfolio AI assistant grounded in live trees/alerts/weather/carbon; tree photo AI analysis; satellite health narrative; metered AI scan quotas
- **Source in repo:** `docs/AI_SERVICE.md`, `docs/PRESENTATION_PROMPT.md` (Slide 23), `backend/app/services/payments/catalog.py`

### Appendix C — Deployment & data residency
- **Purpose:** IT/security reviewer appendix.
- **Bullets:** Docker Compose production path (Hostinger VPS docs); India region hosting option; DPDP consent ledger and erasure; WCAG + Hindi i18n on core flows
- **Source in repo:** `docs/DEPLOYMENT_HOSTINGER.md`, `docs/SECURITY.md`, `docs/PRESENTATION_PROMPT.md` (Slide 24)

---

## Honesty guardrails table

| Claim to avoid | Accurate framing | Source |
|---|---|---|
| “Verra / Gold Standard certified” | Checklists and framework reports for **audit preparation** only; no registry integration | `backend/app/services/reports/frameworks.py` (`DISCLAIMER`), `backend/app/services/compliance/checklists.py` |
| “We issue carbon credits” | **Internal ledger** with serials for traceability; not external registry issuance until org records external reference | `backend/app/services/credits/ledger.py`, `backend/app/services/credits/serials.py` |
| “Official Green Credit registry” | MoEFCC Green Credit **calculator** and evidence export; ICFRE verification is a field, not platform issuance | `backend/app/services/credits/green_credit.py` |
| “Files BRSR with SEBI” | BRSR Core Principle 6 **export** for assurance prep | `backend/app/services/reports/brsr.py` |
| “TNFD assured disclosure” | TNFD LEAP-structured **export** where implemented [VERIFY: confirm TNFD export endpoint in reporting API] | `docs/PRESENTATION_PROMPT.md` |
| “NISAR satellite data” | NISAR-**inspired** analytics; live SAR is **Sentinel-1 C-band** | `docs/PRESENTATION_PROMPT.md`, `docs/SAR_OPERATIONS.md` |
| “RFC 3161 timestamped” (always) | Supported **when** `EVIDENCE_TSA_URL` configured | `docs/LAUNCH_GATES.md` |
| “100% verified survival” | Survival **surveys** and satellite **presence signals** are probabilistic at single-tree scale; stronger at plantation/polygon scale | `docs/SATELLITE_MONITORING.md` §5 |
| “We plant trees” (without qualification) | Platform enables **Plant → Track → Report**; physical planting may be client, agency, or services partner — not a software module [VERIFY: services delivery model] | No fulfillment module in repo |
| “Track-only is available today” | Platform supports MRV/tracking; **Track-only SKU** is commercial packaging flagged for later | User brief / no SKU in `payments/catalog.py` |
| “CSR Event Pack” is a product button | **Commercial bundle name** — maps to project + mobile registration + reports, not a separate code path [VERIFY] | Sales packaging |
| “Government is our primary customer” | Government schemes **supported**; this deck leads with **mining + CSR agencies** | `backend/app/services/onboarding/audience.py` |
| “FAO live locust feed” | Seasonal corridor **heuristics**, labelled estimates | `docs/PRESENTATION_PROMPT.md` |
| “Ed25519 signed bundles” (always) | Signing when `EVIDENCE_SIGNING_KEY` set in production | `backend/app/core/production_guards.py` |

---

## Screenshot shot-list for visual deck

| Slide | Capture | Path / notes |
|---|---|---|
| 1 | Dashboard or portfolio hero with KPIs | `/dashboard` or `/portfolio-health` |
| 2 | Alerts + compliance violations contrast | `/alerts` or home queue items |
| 3 | Project overview with scheme badge | `/projects/{id}` |
| 4 | Audience/scheme selection | Onboarding audience picker or `/projects/new` scheme picker |
| 5 | Designed SKU cards — no portal capture required | Designer-built |
| 6 | Monitoring dashboard + job runs | `/monitoring` |
| 6 | Mobile field home | Mobile: home / field ops screen |
| 7 | Map with polygon + pins | `/map?project={id}` |
| 7 | Mobile Add Tree GPS step | Mobile: add tree wizard |
| 8 | NDVI time series / satellite panel | `/satellite?project={id}` |
| 8 | SAR integrity / fusion card | Project satellite fusion or work-area SAR view |
| 9 | Estate Watch audit intake wizard | Project audit intake route |
| 9 | Compliance checklist auto-signals | `/projects/{id}/compliance` or checklist UI |
| 10 | Plantation reports index | Sidebar → Plantation reports |
| 10 | BRSR / framework export UI | Project compliance exports section |
| 10 | Carbon range / ledger disclaimer | Tree or project carbon panel |
| 11 | Evidence bundle download | Project → evidence bundle |
| 11 | Estate Watch attestation | Audit engagement attestation screen |
| 12 | Comparison graphic | Designer-built from table in slide 12 |
| 13 | Monitoring summary after first scan | `/monitoring` or project monitoring tab |
| 14 | Public tree verification QR page | `aranyix.tech/p/{demo_code}` |
| Appx A | Bioacoustic spectrogram + species list | `/bioacoustic` project view |
| Appx B | AI assistant panel | `/assistant` |

---

## Document metadata

- **Core slides:** 14
- **Optional appendix slides:** 3 (A–C)
- **Last generated from repo:** 2026-09-16
- **[VERIFY] gaps to confirm before presenting:**
  1. Physical **planting execution** ownership (Aranyix services vs partner vs client-only)
  2. Commercial **SKU names, pricing, and agency white-label** terms
  3. **TNFD export** endpoint availability (referenced in `PRESENTATION_PROMPT.md`; confirm in `backend/app/api/v1/reporting.py`)
  4. Production **EVIDENCE_TSA_URL** and **EVIDENCE_SIGNING_KEY** configuration status
  5. **Bhoonidhi / Sentinel Hub** live vs demo mode on production environment
  6. **Cross-subdomain SSO** if `store.aranyix.tech` marketplace is launched
  7. Exact **mobile offline queue** count on current release build
