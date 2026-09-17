# Central government scheme integration

Aranyix separates **access programs** (who can use the platform) from **central schemes**
(which government funding or compliance programme a plantation project runs under).

## Layers

| Layer | Examples | Storage |
| --- | --- | --- |
| Planting program | `byot`, `government_nhai`, `corporate_esg`, `ngo_community` | `planting_programs` table |
| Central scheme | `campa_ca`, `gim_restoration`, `nhai_highway`, `sahakar_van` | `backend/app/services/schemes/registry.py` |
| Planting project | NHAI Package 3, CAMPA block Rajasthan | `planting_projects.scheme_code` |

## Scheme catalog

| Code | Ministry | Group | Programs |
| --- | --- | --- | --- |
| `campa_ca` | MoEFCC | central | government_nhai, ngo_community |
| `gim_restoration` | MoEFCC | central | government_nhai, ngo_community |
| `mishti_mangrove` | MoEFCC | central | government_nhai, ngo_community |
| `nagar_van` | MoEFCC | central | government_nhai |
| `nhai_highway` | MoRTH / NHAI | central | government_nhai |
| `mgnrega_convergence` | Rural Development | convergence | government_nhai, ngo_community |
| `jal_shakti_riparian` | Jal Shakti | central | government_nhai, ngo_community |
| `green_credit_india` | MoEFCC | corporate | corporate_esg, government_nhai |
| `sahakar_van` | Ministry of Cooperation | cooperative | ngo_community, government_nhai |
| `estate_monitoring` | MoEFCC / State Forest | central | government_nhai, ngo_community, corporate_esg |
| `raj_amrit_poshan_vatika` | Rajasthan Forest & Rural Development | state (Rajasthan `08`) | government_nhai, ngo_community |

## Amrit Poshan Vatika (`raj_amrit_poshan_vatika`)

Rajasthan state nutri-garden programme on Anganwadi, SHG, panchayat, and school sites with
fruit and medicinal plants converged with MGNREGS wage employment.

| Setting | Value |
| --- | --- |
| Segment | `nutri_garden` |
| Template | `amrit_poshan_vatika_v1` |
| Compliance | Guided |
| KPIs | 65% survival, 85% geo-tagged, min 50 trees |
| Checklists | `nutri_garden`, `mgnrega_convergence` |
| Framework profiles | `amrit_poshan_vatika`, `esg_general` |
| Site area | 0.1–0.5 ha per plot |
| Block types | `anganwadi_plot`, `shg_garden`, `panchayat_land`, `school_plot` |

Work-area create/update validates polygon area against template bounds and declared
`scheme_refs.site_area_ha`. Segment code (block type) is required when block types are
defined on the template.

### Scheme metadata fields

| Key | Required | Meaning |
| --- | --- | --- |
| `apv_site_id` | Yes | Rajasthan Forest / district nodal site reference |
| `site_type` | Yes | `anganwadi`, `shg`, `panchayat`, or `school` |
| `anganwadi_name` | No | Anganwadi centre name |
| `shg_name` | No | SHG name |
| `gram_panchayat` | Yes | Gram panchayat jurisdiction |
| `mgnrega_job_card_ref` | No | MGNREGA convergence reference |
| `site_area_ha` | Yes | Declared site area (0.1–0.5 ha) |
| `target_fruit_trees` | No | Target fruit / nut tree count |

## Estate monitoring scheme (`estate_monitoring`)

For **existing forest or plantation cover** where satellite MRV replaces mandatory tree census.

| Setting | Value |
| --- | --- |
| Segment | `estate_monitoring` |
| Template | `estate_monitoring_v1` |
| Compliance | Guided |
| KPIs | Scan coverage ≥80%, scans within 35 days — **not** survival/geo-tag |
| Checklist | `estate_monitoring` |
| Work areas | 10–500 ha polygons; ~100 ha recommended per block |
| Tree registration | Optional (plot-based ground truth only) |

Lifecycle: use planting schemes (CAMPA, Nagar Van, GIM) during the planting phase, then
`estate_monitoring` for 5–20 year post-planting watch. Link via optional `parent_scheme_code`
in estate metadata.

**Cross-scheme satellite watch:** Any planting project can enable `metadata.satellite_watch_enabled`
in Project admin → Satellite watch programme. This turns on NDVI/SAR KPIs, compliance workflow scan
steps, and deep links to `/satellite?project=` without switching to the estate-only UX shell.

## API

- `GET /api/v1/schemes` — list schemes (`?program_code=government_nhai`)
- `GET /api/v1/schemes/{code}` — scheme detail (includes `metadata_sections`)
- `POST /api/v1/planting-projects` — accepts `scheme_code`; validates `scheme_refs` when provided
- `PATCH /api/v1/planting-projects/{id}/scheme-metadata` — update govt reference IDs
- `GET /api/v1/planting-projects/{id}/scheme-kpis` — survival / geo-tag KPIs vs scheme targets
- `GET /api/v1/planting-projects?scheme_code=campa_ca` — filter projects
- `GET /api/v1/platform/schemes/summary` — platform admin rollup by scheme
- `POST /api/v1/platform/schemes/apo-import` — CAMPA APO CSV import (platform admin)

## Phases 3–7 (implemented)

- **Phase 3:** Scheme metadata forms + `PATCH scheme-metadata` validation
- **Phase 4:** Auto-attach scheme checklists on project create; workflow prefers `scheme_code`
- **Phase 5:** `scheme` block in MRV export; `scheme-summary.json` in evidence bundle; framework profiles
- **Phase 6:** `by_scheme` in field-ops summary; platform scheme rollup; project KPI cards
- **Phase 7:** CAMPA APO CSV import; webhook `compliance.scheme.gaps_identified`

## Field dictionary (selected)

| Key | Schemes | Meaning |
| --- | --- | --- |
| `nagar_van_project_id` | nagar_van | Nagar Van Yojana project ID |
| `sahakar_van_project_id` | sahakar_van | Sahakar Van cooperative project ID |
| `nccf_project_ref` | sahakar_van | NCCF project reference |
| `amul_union_name` | sahakar_van | Amul dairy union / GCMMF |
| `green_credit_land_bank_id` | green_credit_india | MoEFCC GCP land bank registration |
| `apv_site_id` | raj_amrit_poshan_vatika | Amrit Poshan Vatika site ID |
| `site_type` | raj_amrit_poshan_vatika | Anganwadi / SHG / panchayat / school |
| `mgnrega_job_card_ref` | raj_amrit_poshan_vatika | MGNREGA job card / work estimate |

## Nagar Van planting template (`nagar_van_urban_forest_v1`)

| Setting | Value |
| --- | --- |
| Segment | `nagar_van_urban` |
| Layout | Cluster (dense urban forest blocks) |
| Spacing | 2.5 m minimum |
| Density | 800–5,000 trees/ha |
| Native species | 80% minimum |
| Site target | 10,000+ trees per project |
| Compliance | Strict |

MRV exports use `urban_forest_block` segment reports.

## Sahakar Van planting template (`sahakar_van_cooperative_v1`)

Cooperative afforestation led by **NCCF** and **Amul** under the **Ministry of Cooperation** (pilot: Sumel village, Jaipur — 64 acres).

| Setting | Value |
| --- | --- |
| Segment | `sahakar_van_coop` |
| Layout | Miyawaki cluster + conventional row (mixed) |
| Miyawaki spacing | 1.0 m minimum |
| Conventional spacing | 3.0 m minimum |
| Miyawaki density | 2,000–12,000 trees/ha |
| Conventional density | 400–1,200 trees/ha |
| Allowed species | Khejri, Rohida, Neem, Ber, Babool, Palash, Arjun (arid-land natives) |
| Native species | 100% (approved list only) |
| Site prep | Soil treatment, organic manure (gobar khad), rainwater harvesting required |
| Community | ≥50% cooperative-led participation |
| KPI targets | 70% survival, 90% geo-tagged |
| Compliance | Strict |

MRV exports use `cooperative_forest_block` segment reports with area in ha and acres.
