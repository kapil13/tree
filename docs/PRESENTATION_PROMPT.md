# Gamma.ai Presentation Prompt — Aranyix / BYOT Platform

Copy everything inside the fenced block below into Gamma.ai ("Paste in text" → "Generate").
All content is grounded in the actual codebase; see the honesty guardrails at the end of this file.

---

## The prompt

```text
Create a professional, investor- and government-grade sales deck for "Aranyix" — a ClimateTech MRV
(Measurement, Reporting & Verification) platform for tree plantation, carbon, biodiversity and
compliance. Audience: corporate ESG heads, government forest departments, PSU/infrastructure
compliance officers, carbon project developers, and investors.

DESIGN DIRECTION
- Tone: authoritative, evidence-driven, modern enterprise SaaS. Not playful.
- Palette: deep forest green (#14532d), fresh green accent (#16a34a), warm stone neutrals, one
  amber accent for warnings, one sky-blue accent for satellite/data.
- Typography: serif display headings, clean sans body.
- Visuals: satellite imagery, forest canopy aerials, map/geospatial UI, dashboards, data tables,
  audit/verification iconography. Avoid stock "handshake" or generic business photos.
- Every slide: short headline, 3–6 tight bullets, one supporting visual or data block.
- Include icons for each capability. Use comparison tables and matrices where indicated.
- Add subtle "Estimate / audit-ready" caveat styling where noted.

BUILD THESE SLIDES IN THIS EXACT ORDER:

SLIDE 1 — TITLE
Title: "Aranyix — Intelligence for a Thriving Planet"
Subtitle: "Audit-ready MRV for plantation, carbon, biodiversity and compliance"
Add a one-line positioning statement: "One platform. Every tree. Every standard — Indian and
international." Include space for logo and a full-bleed forest canopy / satellite hybrid image.

SLIDE 2 — THE PROBLEM
Headline: "Plantation claims collapse under audit"
Bullets:
- Tree counts exist in spreadsheets, photos live in WhatsApp, GPS is missing or unverifiable
- Carbon numbers are single point estimates with no uncertainty, no mortality, no buffer
- Compliance evidence is assembled manually, weeks before an NGT/CAMPA/SEBI/verifier deadline
- Satellite checks are one-off consultant reports, not continuous monitoring
- No tamper-evident trail — auditors cannot prove data was not edited after the fact
- Indian scheme rules (CAMPA, Green Credit, Nagar Van) and international standards (Verra, ICVCM)
  live in different systems
Visual: split image — messy spreadsheet/paper trail vs clean verified dashboard.

SLIDE 3 — THE SOLUTION IN ONE LINE
Headline: "From a geotagged sapling to a signed, auditor-ready evidence bundle"
Show a horizontal 6-step pipeline:
Register (GPS + photo) → Measure (DBH/height time series) → Monitor (satellite + SAR + acoustics)
→ Quantify (carbon with 90% confidence interval) → Comply (Indian + global checklists)
→ Prove (cryptographically signed evidence bundle)
Add caption: "Each step writes to a hash-chained audit log."

SLIDE 4 — PLATFORM ARCHITECTURE AT A GLANCE
Headline: "Four surfaces, one source of truth"
Four columns with icons:
- Web dashboard (Next.js) — executives, compliance teams, verifiers
- Mobile field app (Flutter, offline-first) — field workers and supervisors
- API + geospatial services (FastAPI + PostGIS) — integration and automation
- Automation workers (Celery) — scheduled satellite sweeps, alerts, digests
Footer strip: "PostGIS geospatial core · S3-compatible media · role-based access control"

SLIDE 5 — TREE REGISTRATION & FIELD OPERATIONS
Headline: "Field data that survives an audit"
Bullets:
- GPS-tagged tree registration with photos, species, and planting program
- Append-only measurement time series — DBH, height, canopy — never overwritten
- Method and instrument captured per measurement (tape vs visual estimate drives uncertainty)
- Survival surveys with alive / dead / removed / stressed events and cause codes
- Offline-first mobile queues for tree registration and audio — auto-syncs on reconnect
- Work-area polygons (geofences) with area in hectares as the spatial unit of record
Visual: mobile app screens + map with polygon boundary and tree pins.

SLIDE 6 — MONITORING: THE CONTINUOUS LAYER
Headline: "Monitoring is scheduled, not requested"
Bullets:
- Monthly optical satellite sweeps across every work area and tree
- Monthly SAR sweeps plus weekly re-scan of at-risk areas
- Daily health roundup: poor-health trees, stale analyses, failed scans
- Compliance deadline scanning and escalation of violations open beyond 7 days
- Daily satellite health digest delivered by email/SMS on user preference
- Every automated job writes a job-run record for ops traceability
Visual: timeline/calendar graphic of automated jobs with a monitoring dashboard screenshot.

SLIDE 7 — SATELLITE MONITORING (OPTICAL)
Headline: "Sentinel-2 NDVI, from pixel to project KPI"
Bullets:
- NDVI and EVI sampling for individual trees (point) and work areas (polygon)
- Cloud cover, presence confirmation, and change vs baseline on every scan
- Automatic alert when NDVI drops more than 0.15 against baseline
- NDVI preview imagery generated per work area
- Full NDVI time series charted per plantation
- Provider: Copernicus Sentinel Hub; graceful demo fallback when keys are absent
Visual: NDVI heatmap chip over a plantation polygon + trend line chart.

SLIDE 8 — SAR MONITORING & FOREST INTEGRITY SCORE
Headline: "See through cloud and monsoon"
Bullets:
- Sentinel-1 C-band SAR via Google Earth Engine or Sentinel Hub
- Derived signals: backscatter, double-bounce, wetland probability, ground moisture,
  canopy–ground mismatch, coherence
- Optical + SAR fusion produces a 0–100 Forest Integrity Score with a letter grade
- Monitoring modes: aligned, optical–SAR divergent, and monsoon gap-fill
- Ten distinct SAR alert types including integrity drop, flood risk, ground instability,
  hidden moisture and wetland detection
- SAR findings automatically create field verification tasks for ground crews
Add small caption: "L/S-band analytics are NISAR-inspired; live feed is Sentinel-1 C-band."
Visual: side-by-side optical (cloudy) vs SAR (clear) with an integrity gauge.

SLIDE 9 — ISRO BHOONIDHI & MULTI-SOURCE FUSION
Headline: "Indian earth observation, integrated"
Bullets:
- ISRO Bhoonidhi STAC catalog search across NRSC collections
- Collections covered: ResourceSat LISS-3, AWIFS, EOS-06 OCM NDVI, Sentinel-1 GRD
- Fusion status per work area: Sentinel NDVI trend, Bhoonidhi scene availability, SAR integrity
- Recommended action generated when sources diverge or data goes stale
- Supports sovereign-data narratives for government and PSU buyers
Visual: three data-source cards converging into one fused work-area score.

SLIDE 10 — SATELLITE HEALTH AI: PEST, DISEASE & STRESS
Headline: "NDVI decline, explained"
Bullets:
- Rule-based engine analyses NDVI time series for decline and spatial heterogeneity
- Classifies pest, disease and stress signals with a risk level
- Produces specific findings plus treatment recommendations
- Optional AI narrative converts technical output into 2–4 farmer-readable sentences
- Results persist as a health analysis record and trigger alerts
- Platform admin telemetry shows live vs demo scan ratios for production assurance
Visual: health analysis card with risk badge and recommendation list.

SLIDE 11 — WEATHER & THREAT INTELLIGENCE
Headline: "Risk before damage"
Bullets:
- 1–7 day forecast at plantation centroid: WMO codes, temperature, precipitation, wind
- Weather alert rules for heavy rain, hail, heat, wind and frost
- Portfolio threat watch combines weather, pest/disease intel and locust corridors
- Composite risk score with early warnings and recommended actions per site
- Pest intel fuses satellite health, 48-hour rainfall and bioacoustic ecosystem signals
- Powered by Open-Meteo — no API key dependency, always live
Visual: threat watch panel with per-site risk chips and a 7-day forecast strip.

SLIDE 12 — BIODIVERSITY & BIOACOUSTIC MONITORING (DIFFERENTIATOR)
Headline: "Prove the forest came back to life"
Bullets:
- Field audio recording from the mobile app with GPS and offline queue
- Species identification via BirdNET, plus multi-taxa detection for amphibians, mammals,
  insects and reptiles
- Ecoacoustic indices: ACI, ADI, AEI, Bioacoustic Index, NDSI
- Shannon and Simpson diversity, species richness, and a 0–100 Biodiversity Health Score
- IUCN Red List status enrichment and GBIF regional fauna baselines
- NDVI-to-bioacoustic correlation shows whether canopy recovery matches ecosystem recovery
Visual: spectrogram + species list with IUCN status badges + diversity gauge.

SLIDE 13 — CARBON QUANTIFICATION DONE HONESTLY
Headline: "A range, not a marketing number"
Bullets:
- Three methodologies: IPCC AR6, Verra VM0047, Gold Standard LUF
- Species-specific allometrics plus Chave 2014 pan-tropical model and IPCC root-shoot ratios
- Monte Carlo uncertainty propagation produces a 90% confidence interval on every CO2e figure
- Verra-style conservative deduction applied automatically when uncertainty exceeds 15%
- Mortality-adjusted ex-ante lifetime credits, not naive multiplication
- Dynamic permanence buffer of 10–30% driven by an NPRT risk assessment
- Additional carbon pools: deadwood, litter and soil organic carbon
Visual: CO2e figure shown as a lower–upper range with an "Estimate" chip and a buffer breakdown.

SLIDE 14 — FULL VM0047 PROJECT ACCOUNTING
Headline: "Baseline, additionality, leakage — structured, not narrative"
Bullets:
- Project baseline scenarios with land cover class and baseline emissions/removals
- Additionality assessments with scored factors and assessor attribution
- Leakage accounts by type with estimated leakage and mitigation quantities
- Carbon pool configuration per project
- Consolidated VM0047 readiness summary endpoint for verifiers
Visual: four-panel VM0047 accounting board.

SLIDE 15 — CREDIT LEDGER & DOUBLE-COUNTING PREVENTION
Headline: "Registry-grade discipline before the registry"
Bullets:
- Project credit ledger with strata, buffer withheld, gross and net credits
- Lifecycle states: estimated → verified → buffered → issued
- Serial numbers in a structured format with state and year components
- Retirement records including Paris Agreement Article 6 corresponding-adjustment fields
- Exclusive claim registry rejects conflicting claims across scheme families at the database level
- MoEFCC Green Credit calculator with 5-year vesting and density thresholds
Add caption: "Internal registry for traceability — not an external registry issuance."
Visual: ledger table with serials and a blocked duplicate-claim callout.

SLIDE 16 — INDIAN NATIONAL COMPLIANCE COVERAGE
Headline: "Nine central government schemes, built in"
Present as a table with columns: Scheme | Ministry | What the platform provides.
Rows:
- CAMPA Compensatory Afforestation | MoEFCC | Checklist, framework report, APO CSV import
- Green India Mission (GIM) | MoEFCC | Readiness checklist and framework report
- MISHTI Mangrove Restoration | MoEFCC | Coastal readiness checklist and report
- Nagar Van Yojana Urban Forest | MoEFCC | Checklist, report, urban planting template
- Green Credit Programme 2023 | MoEFCC | Readiness checklist, credit calculator, report
- NHAI Green Highway Plantation | MoRTH / NHAI | Highway planting template, chainage work areas
- MGNREGA Farm Forestry Convergence | Rural Development | Convergence readiness checklist
- Jal Shakti Riverbank Plantation | Jal Shakti | Riparian project support
- Sahakar Van Cooperative Afforestation | Ministry of Cooperation | Checklist, report, template
Footer: "Plus SEBI BRSR Core Principle 6 export and India DPDP Act privacy compliance."

SLIDE 17 — INTERNATIONAL STANDARDS COVERAGE
Headline: "Global standards, same evidence base"
Present as a table with columns: Standard | Body | Platform capability.
Rows:
- VM0047 ARR | Verra | Eligibility checklist, full baseline/additionality/leakage accounting
- Land Use & Forests | Gold Standard | Safeguards checklist and framework report
- Core Carbon Principles | ICVCM | 10-principle checklist with automated signals
- REDD+ Warsaw Framework | UNFCCC | Programme readiness checklist and MRV evidence report
- AR6 / 2019 Refinement | IPCC | Tier 1–2 quantification and inventory support report
- Land Sector Removals 2024 | GHG Protocol | Corporate inventory export with uncertainty bands
- ISO 14064-2:2019 | ISO | Structured project report: boundary, baseline, monitoring plan
- TNFD LEAP | TNFD | Locate–Evaluate–Assess–Prepare nature disclosure export
- Darwin Core Archive | TDWG / GBIF | Species occurrence archive ready for GBIF publishing
- Paris Agreement Art. 4 & 6 | UNFCCC | NDC traceability report and retirement metadata
- STAC 1.0 / OGC Features | OGC | Geospatial catalog and GeoJSON feature endpoints

SLIDE 18 — COMPLIANCE WORKFLOW IN THE PORTAL
Headline: "Twelve guided checklists that fill themselves in"
Bullets:
- Scheme selection drives which checklist and report profile a project receives
- Auto-signals mark items complete from live platform data — measurements, ledger, evidence exports
- Violation tracking with deadlines, escalation and reminder alerts
- Rule engine enforces planting standards: spacing, pit size, species mix, density
- Seven planting templates encode scheme-specific field rules
- Convergence pairs supported, for example CAMPA or NHAI alongside MGNREGA
Visual: checklist UI with auto-ticked items and a compliance progress ring.

SLIDE 19 — EVIDENCE, AUDIT TRAIL & TRUST
Headline: "Tamper-evident by construction"
Bullets:
- SHA-256 hash-chained audit log across every recorded action
- Daily audit root hash published to object storage for external transparency
- Chain verification endpoint auditors can call independently
- Evidence bundles: MRV context, compliance PDF, carbon summary, scheme KPIs, photo manifest
- Ed25519 detached signature and SHA-256 digest returned in response headers
- RFC 3161 trusted timestamping supported when a TSA endpoint is configured
Visual: chain-link graphic + downloadable evidence bundle contents list.

SLIDE 20 — INDEPENDENT VERIFIER WORKFLOW
Headline: "Give auditors access without giving them edit rights"
Bullets:
- Dedicated verifier role with attest-only permissions
- Random or species-stratified sampling of project trees
- Per-item attestation with cryptographic attestation hash and timestamp
- PDF sample audit report export
- Stratified plot monitoring as a designed alternative to full census
- Plot design, automatic plot layout inside work areas, visits, and statistical extrapolation
Visual: verifier sampling table with approved/rejected states.

SLIDE 21 — REPORTING & EXPORTS
Headline: "One click from dashboard to disclosure"
Bullets:
- SEBI BRSR Core Principle 6 export with assurance pack
- ISO 14064-2 project report as JSON, Excel or combined assurance zip
- TNFD LEAP nature disclosure using bioacoustic, IUCN and NDVI evidence
- GHG Protocol Land Sector removals with scope tags and 90% uncertainty bands
- Darwin Core Archive for GBIF publication
- Twelve framework report profiles spanning Indian schemes and global standards
- STAC catalog and GeoJSON features for auditor GIS workflows
Visual: grid of export format cards with file-type icons.

SLIDE 22 — ROLES & WHO GETS WHAT
Headline: "Purpose-built views, not one dashboard for everyone"
Four-column layout:
- Citizen steward — tag trees, AI health scans, personal carbon estimate, stewardship badges
- Field worker / supervisor — offline registration, survival surveys, field tasks, plot visits
- Compliance / ESG lead — checklists, violations, framework reports, evidence bundles
- Executive / verifier — portfolio KPIs, integrity scores, credit ledger, attestation
Footer: "Role-based access control with organisation and project scoping."

SLIDE 23 — AI ACROSS THE PLATFORM
Headline: "AI where it adds evidence, not noise"
Bullets:
- Tree photo analysis: species detection, health classification, disease findings, growth estimate
- Satellite health narrative that translates NDVI analytics into plain language
- Portfolio AI assistant grounded in live data — trees, alerts, weather, carbon, intelligence
- Executive brief generation for leadership summaries
- Metered AI scan quotas per account tier
- Deterministic fallbacks keep the product functional without AI keys
Visual: assistant chat panel answering a portfolio question with cited numbers.

SLIDE 24 — ENTERPRISE READINESS
Headline: "Built for procurement review"
Bullets:
- India DPDP Act: consent ledger, data export, account erasure, grievance officer
- WCAG accessibility testing and Hindi localisation across core flows
- Progressive Web App with offline supervisor tree list
- Organisation and team management, invites, and granular module grants
- Webhooks, audit exports and OGC/STAC APIs for system integration
- Docker Compose, Terraform and Kubernetes deployment paths
Visual: security/compliance badge row.

SLIDE 25 — WHY ARANYIX WINS
Headline: "The only platform that closes the loop"
Comparison table with columns: Capability | Spreadsheets | Point solutions | Aranyix.
Rows (tick/cross): Per-tree GPS MRV · Continuous satellite + SAR · Biodiversity evidence ·
Carbon with confidence intervals · Indian scheme compliance · International standards ·
Tamper-evident audit trail · Signed evidence bundles · Offline field capture.
Aranyix column all ticks.

SLIDE 26 — CALL TO ACTION
Headline: "See your own plantation, verified"
Bullets:
- Pilot on one project: register trees, run a satellite sweep, export an evidence bundle
- Compliance mapping workshop for your scheme portfolio
- Integration review for your existing ESG and GIS systems
Add contact block placeholder and a closing line:
"Aranyix — evidence you can hand to a regulator, an auditor, or a buyer."
```

---

## Honesty guardrails (read before presenting)

These keep the deck defensible in a technical or due-diligence review.

| Claim to avoid | Accurate framing |
|---|---|
| "NISAR satellite data" | NISAR-**inspired** analytics; live SAR is Sentinel-1 C-band |
| "Verra/Gold Standard certified" | Checklists and reports for **audit preparation**; no registry integration |
| "Issues carbon credits" | **Internal ledger** with serials; not external registry issuance |
| "Official Green Credit registry" | MoEFCC Green Credit **calculator**; ICFRE verification field only |
| "Files BRSR with SEBI" | BRSR Core Principle 6 **export** for assurance prep |
| "TNFD assured disclosure" | TNFD LEAP-structured **export** |
| "FAO locust feed" | Seasonal corridor **heuristics**, labelled as estimates |
| "RFC 3161 timestamped" | Supported **when** `EVIDENCE_TSA_URL` is configured |

## Optional add-on slides

Ask Gamma to append if the audience needs them:

- **Pricing / tiers** — citizen free tier, metered AI scans, professional programs
- **Deployment & data residency** — self-hosted VPS, Indian region hosting
- **Roadmap** — iOS app, SOC 2 control matrix, live NISAR when operational, registry integrations
- **Case study** — one project walked end to end with real screenshots

## Tips for better Gamma output

1. Paste the prompt into **"Paste in text"**, not "Generate from prompt" — it preserves slide structure.
2. Set card count to **26** so Gamma does not merge slides.
3. Choose a dark or earth-tone theme; the palette instructions land better.
4. Replace AI-generated visuals on slides 5–12 and 18–21 with **real portal screenshots**.
5. For a 10-minute pitch, keep slides 1, 2, 3, 6, 13, 16, 17, 19, 25, 26.
