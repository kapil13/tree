# Central government scheme integration

Aranyix separates **access programs** (who can use the platform) from **central schemes**
(which government funding or compliance programme a plantation project runs under).

## Layers

| Layer | Examples | Storage |
| --- | --- | --- |
| Planting program | `byot`, `government_nhai`, `corporate_esg`, `ngo_community` | `planting_programs` table |
| Central scheme | `campa_ca`, `gim_restoration`, `nhai_highway`, `mishti_mangrove` | `backend/app/services/schemes/registry.py` |
| Planting project | NHAI Package 3, CAMPA block Rajasthan | `planting_projects.scheme_code` |

## v1 scheme catalog (PR-1 + PR-2)

| Code | Ministry | Programs |
| --- | --- | --- |
| `campa_ca` | MoEFCC | government_nhai, ngo_community |
| `gim_restoration` | MoEFCC | government_nhai, ngo_community |
| `mishti_mangrove` | MoEFCC | government_nhai, ngo_community |
| `nagar_van` | MoEFCC | government_nhai | `nagar_van_urban` / `nagar_van_urban_forest_v1` |
| `nhai_highway` | MoRTH / NHAI | government_nhai |
| `mgnrega_convergence` | Rural Development | government_nhai, ngo_community |
| `jal_shakti_riparian` | Jal Shakti | government_nhai, ngo_community |
| `green_credit_india` | MoEFCC | corporate_esg, government_nhai |

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
- **Phase 5:** `scheme` block in MRV export; `scheme-summary.json` in evidence bundle; framework profiles (`gim`, `mishti`, `nagar_van`, `green_credit_india`)
- **Phase 6:** `by_scheme` in field-ops summary; platform scheme rollup; project KPI cards
- **Phase 7:** CAMPA APO CSV import; webhook `compliance.scheme.gaps_identified`

## Field dictionary

| Key | Schemes | Meaning |
| --- | --- | --- |
| `pca_number` | campa_ca | Compensatory afforestation proposal number |
| `forest_diversion_id` | campa_ca | Forest Conservation Act diversion reference |
| `apo_financial_year` | campa_ca, gim_restoration | State CAMPA annual plan year |
| `mgnrega_work_estimate_id` | mgnrega_convergence | MGNREGA work estimate reference |
| `mishti_project_id` | mishti_mangrove | MISHTI coastal project identifier |
| `nagar_van_project_id` | nagar_van | Nagar Van Yojana project ID |

## Nagar Van planting template (`nagar_van_urban_forest_v1`)

When a planting project is created under the `nagar_van` central scheme, Aranyix applies:

| Setting | Value |
| --- | --- |
| Segment | `nagar_van_urban` |
| Template | `nagar_van_urban_forest_v1` |
| Layout | Cluster (dense urban forest blocks) |
| Spacing | 2.5 m minimum |
| Density | 800–5,000 trees/ha |
| Native species | 80% minimum |
| Site target | 10,000+ trees per project |
| Work areas | Polygon blocks (ward park, degraded land, Miyawaki patch, avenue buffer) |
| Compliance | Strict |

MRV exports include an `urban_forest_block` segment report with block count, area, density, and tree progress vs the 10,000-tree scheme target.
| `green_credit_land_bank_id` | green_credit_india | MoEFCC GCP land bank registration |
