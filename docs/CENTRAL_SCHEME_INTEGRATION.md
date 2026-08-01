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
| `nagar_van` | MoEFCC | government_nhai |
| `nhai_highway` | MoRTH / NHAI | government_nhai |
| `mgnrega_convergence` | Rural Development | government_nhai, ngo_community |
| `jal_shakti_riparian` | Jal Shakti | government_nhai, ngo_community |
| `green_credit_india` | MoEFCC | corporate_esg, government_nhai |

## API

- `GET /api/v1/schemes` — list schemes (`?program_code=government_nhai`)
- `GET /api/v1/schemes/{code}` — scheme detail
- `POST /api/v1/planting-projects` — accepts `scheme_code`
- `GET /api/v1/planting-projects?scheme_code=campa_ca` — filter projects

## Validation rules

- `government_nhai` and `ngo_community` projects **require** `scheme_code`
- `corporate_esg` and `byot` — `scheme_code` optional
- Scheme must be active and allowed for the selected program

## Next phases (not in this PR)

- **Phase 3:** scheme metadata forms (`pca_number`, MGNREGA work ID, etc.)
- **Phase 4:** auto-attach compliance checklists from `checklist_codes`
- **Phase 5:** scheme block in evidence bundle + framework reports
- **Phase 6:** platform admin rollup by scheme
- **Phase 7:** CAMPA APO CSV import

## Field dictionary (planned)

| Key | Schemes | Meaning |
| --- | --- | --- |
| `pca_number` | campa_ca | Compensatory afforestation proposal number |
| `forest_diversion_id` | campa_ca | Forest Conservation Act diversion reference |
| `apo_financial_year` | campa_ca, gim_restoration | State CAMPA annual plan year |
| `mgnrega_work_estimate_id` | mgnrega_convergence | MGNREGA work estimate reference |
| `mishti_project_id` | mishti_mangrove | MISHTI coastal project identifier |
| `nagar_van_project_id` | nagar_van | Nagar Van Yojana project ID |
| `green_credit_land_bank_id` | green_credit_india | MoEFCC GCP land bank registration |
