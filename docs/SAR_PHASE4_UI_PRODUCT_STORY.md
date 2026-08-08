# SAR Phase 4 — UI & Axentis product story

Phase 4 turns Phase 3 operational SAR data into a **customer-facing product narrative**: Forest Integrity as a hero metric, trend visualisation, executive visibility, and Axentis-branded positioning.

## Slices

| Slice | Scope | Status |
|-------|--------|--------|
| **4.1** | Forest Integrity hero + trend chart on `/satellite` | In progress |
| **4.2** | Axentis product story banner (NISAR-inspired positioning) | In progress |
| **4.3** | Executive dashboard SAR intelligence panel | In progress |
| **4.4** | Portfolio overview SAR KPIs | In progress |
| **4.5** | Mobile SAR integrity cards (enhanced) | Planned |
| **4.6** | PDF SAR integrity report | Planned |
| **4.7** | Dual-provider fallback (`SAR_FALLBACK_PROVIDER`) | Planned |

## 4.1 Forest Integrity UX

- **Hero card** — score /100, grade, monitoring mode badge, recommended action
- **Trend chart** — Forest Integrity over time from SAR monitoring series
- **Ground metrics** — wetland probability, L/S-band backscatter (existing)

Shared labels: `frontend/lib/sar-labels.ts`

## 4.2 Axentis product story

Satellite page banner explains:

- NISAR-inspired ground intelligence (moisture under canopy, monsoon gap-fill)
- Axentis Technologies as platform operator
- Link to monitoring dashboard and CSV export

## 4.3 Executive dashboard

`SarIntelligencePanel` on `/dashboard`:

- Portfolio avg Forest Integrity
- At-risk / divergent / aligned work area counts
- Top at-risk sites with link to satellite view

## API dependencies (Phase 3 — no new endpoints)

- `GET /api/v1/sar/work-areas/{id}/monitoring` — trend points
- `GET /api/v1/planting-projects/monitoring-summary` — portfolio KPIs
- `GET /api/v1/sar/portfolio-export` — compliance CSV

## Verification

```bash
cd frontend && npm run typecheck
# Open /satellite → select work area → Forest Integrity hero + trend chart
# Open /dashboard → SAR intelligence panel
```
