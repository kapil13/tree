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
