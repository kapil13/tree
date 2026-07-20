# Phase 5 — Reporting, credits & audit

Phase 5 makes Aranyix **audit-ready** for NHAI, NGT/CAMPA, Verra VM0047, and ESG reviewers. It does **not** issue carbon credits or certify legal compliance.

## Build order

| Slice | Status | Description |
|-------|--------|-------------|
| **5.1 Audit trail** | Done | Append-only `audit_logs` with org scope, API, UI |
| **5.3 Evidence bundles** | Done | Zip + SHA-256 manifest per project |
| 5.2 Framework-mapped reports | Planned | VM0047, REDD+, NGT profile exports |
| 5.4 Credit ledger | Planned | Buffer pool accounting, credit states |
| 5.5 Checklists | Planned | Guided eligibility questionnaires |
| 5.6–5.7 Webhooks + public verification | Planned | HMAC webhooks, share links |

## 5.1 Audit trail

### Recorded actions

| Action | Trigger |
|--------|---------|
| `tree.create` / `update` / `delete` / `regeotag` / `image.add` | Tree CRUD |
| `carbon.recalculate` | Carbon engine run |
| `report.queue` / `report.download` | Report generation |
| `project.create` / `project.update` | Planting projects |
| `compliance.violation.resolve` | Compliance tab |
| `mrv.export` | MRV PDF/XLSX download |
| `evidence_bundle.generate` | Evidence zip download |
| `user.register` | Signup |
| `auth.login` | Password or OTP login |

### API

```
GET /api/v1/audit/logs?page=1&page_size=50&action=tree.create
```

Requires role with `audit:read` (NGO, corporate, government, field supervisor, admin).

### Migration

`0014_audit_org_id` — adds `organization_id` to `audit_logs` for workspace filtering.

## 5.3 Evidence bundles

### Endpoint

```
GET /api/v1/planting-projects/{project_id}/evidence-bundle?include_photos=true
```

Returns `application/zip` with:

| File | Contents |
|------|----------|
| `README.txt` | Disclaimer and bundle guide |
| `manifest.json` | SHA-256 per file + bundle hash |
| `mrv-context.json` | Structured MRV data |
| `mrv-compliance.pdf` | Human-readable report |
| `carbon-summary.json` | Aggregated carbon metrics |
| `photos/manifest.json` | Photo metadata |
| `photos/*` | Up to 50 primary tree photos (when S3 available) |

### UI

- Project → Compliance tab → **Evidence bundle (.zip)**
- Settings → **Audit trail**

## Verify locally

```bash
cd backend && pytest tests/test_audit_service.py tests/test_evidence_bundle.py -q
alembic upgrade head   # applies 0014_audit_org_id
```

```bash
# After login as government/corporate user:
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.aranyix.tech/api/v1/audit/logs?page_size=10" | python3 -m json.tool

curl -s -H "Authorization: Bearer $TOKEN" -o bundle.zip \
  "https://api.aranyix.tech/api/v1/planting-projects/{PROJECT_ID}/evidence-bundle"
unzip -l bundle.zip
```

## Disclaimer

All exports include implicit limitation: **prepared for audit; not certification.**
