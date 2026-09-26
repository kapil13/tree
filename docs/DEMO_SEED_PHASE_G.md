# Phase G — Demo & seed completeness

Run after the stack is up:

```bash
make seed
# or
cd backend && python -m app.scripts.seed_demo
```

Password for **all** demo accounts: `byotdemo1234!`

## G1 — Scheme matrix (13 projects)

Each project includes `scheme_refs`, `metadata.location`, one work area polygon, project-linked trees, and ~90-day NDVI stub history.

| Code | Scheme |
|------|--------|
| `DEMO-NAGAR-VAN` | Nagar Van Yojana |
| `DEMO-SAHAKAR-VAN` | Sahakar Van |
| `DEMO-CAMPA-CA` | CAMPA compensatory afforestation |
| `DEMO-NHAI-HWY` | NHAI Green Highway |
| `DEMO-MINING-RECLAM` | Mining reclamation |
| `DEMO-GREEN-CREDIT` | MoEFCC Green Credit |
| `DEMO-GIM-RESTORE` | Green India Mission |
| `DEMO-MISHTI-MANGROVE` | MISHTI mangrove |
| `DEMO-MGNREGA` | MGNREGA convergence |
| `DEMO-JAL-SHAKTI` | Jal Shakti riparian |
| `DEMO-DFI-CORRIDOR` | DFI green corridor |
| `DEMO-ESTATE-WATCH` | Estate & Forest Watch |
| `DEMO-AMRIT-POSHAN` | Amrit Poshan Vatika |

## G2 — Role matrix

| Email | Role | Demo purpose |
|-------|------|----------------|
| `demo@byot.earth` | citizen (`user`) | Personal BYOT grove, adoption |
| `fieldworker@byot.earth` | `field_worker` | Scoped work areas, mobile field home |
| `supervisor@byot.earth` | `field_supervisor` | Project create, verification queue |
| `corporate@byot.earth` | `corporate` manager | CSR / mining / Green Credit projects |
| `ngo@byot.earth` | `ngo` manager | Watershed / MGNREGA / MISHTI projects |
| `manager@byot.earth` | government org admin | Full org portfolio |
| `viewer@byot.earth` | viewer | Read-only RBAC |
| `verifier@byot.earth` | verifier | Attestation / verification |

## G3 — Workflow fixtures

Seeded on `DEMO-ESTATE-WATCH` (and verification on `DEMO-NAGAR-VAN`):

- Verification sample with pending + attested items (`/verification`)
- Audit engagement at `sampling_planned` with 3 field plots
- 3 analyzed bioacoustic sessions with species detections
- NDVI scan history per demo work area (stub Sentinel Hub rows)
- 3 open compliance violations for gap-action UX
- Credit ledger with one issued serial (`BYOT-2026-08-000001` when state `08`)
- Citizen adoption + stewardship due date on `BYOT-DEMO-0000`

Re-running `make seed` is idempotent — existing demo rows are enriched, not duplicated.
