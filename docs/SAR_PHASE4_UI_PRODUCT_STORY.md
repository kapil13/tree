# SAR Phase 4 — UI & Axentis product story

Phase 4 turns Phase 3 operational SAR data into a **customer-facing product narrative**: Forest Integrity as a hero metric, trend visualisation, executive visibility, and Axentis-branded positioning.

## Slices

| Slice | Scope | Status |
|-------|--------|--------|
| **4.1** | Forest Integrity hero + trend chart on `/satellite` | Done |
| **4.2** | Axentis product story banner (NISAR-inspired positioning) | Done |
| **4.3** | Executive dashboard SAR intelligence panel | Done |
| **4.4** | Portfolio overview SAR KPIs | Done |
| **4.5** | Mobile SAR integrity cards | Done |
| **4.6** | PDF SAR integrity report | Done |
| **4.7** | Dual-provider fallback (`SAR_FALLBACK_PROVIDER`) | Done |

## 4.5 Mobile SAR cards

`mobile/lib/src/widgets/sar_monitoring_cards.dart`:

- **Forest Integrity hero** — portfolio avg score, at-risk / divergent / aligned chips
- **Work area tiles** — integrity, mode, recommended action
- **Field verification queue** — open `sar_field_verification` tasks

Monitoring screen: `/monitoring` (deep link `?fence=` highlights work area).

## 4.6 PDF SAR integrity report

```http
GET /api/v1/sar/portfolio-report
```

Returns `sar-forest-integrity-report.pdf` with portfolio KPIs and per-work-area Forest Integrity table.

Web: **Export SAR PDF** on portfolio monitoring tab and executive dashboard SAR panel.

## 4.7 Dual-provider fallback

When primary live SAR fails, try fallback before stub:

```env
SAR_PROVIDER=sentinel_hub
SAR_FALLBACK_PROVIDER=gee
```

| Variable | Values |
|----------|--------|
| `SAR_PROVIDER` | `stub`, `gee`, `sentinel_hub` |
| `SAR_FALLBACK_PROVIDER` | optional `gee` or `sentinel_hub` (must differ from primary) |

`GET /api/v1/sar/status` includes `sar_fallback_provider` when set.

Composite service logs `sar_fallback_provider_used` when fallback succeeds.

## API dependencies

- `GET /api/v1/sar/work-areas/{id}/monitoring` — trend points
- `GET /api/v1/planting-projects/monitoring-summary` — portfolio KPIs
- `GET /api/v1/sar/portfolio-export` — CSV
- `GET /api/v1/sar/portfolio-report` — PDF

## Verification

```bash
cd backend && pytest tests/test_sar_fallback.py tests/test_sar_portfolio_pdf.py -q
cd frontend && npm run typecheck
```
