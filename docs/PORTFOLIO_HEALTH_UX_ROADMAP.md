# Portfolio Health UX — Implementation Roadmap

This roadmap turns the Portfolio Health audit (flow, navigation, and tab UI
consistency) into a shippable sequence of four pull requests. Work proceeds on
feature branches off `main`; each phase has explicit exit criteria before the
next phase starts.

**Strategic intent**

> Portfolio Health is the **single intelligence hub** for org-wide posture —
> compliance, threats, satellite monitoring, and biodiversity — with one visual
> language and predictable drill-down. Satellite, Biodiversity, and Alerts remain
> reachable as **workspaces/inboxes**, not competing entry points.

**Related code today**

| Area | Path |
|------|------|
| Hub shell | `frontend/components/portfolio/portfolio-health-hub.tsx` |
| Tabs | `frontend/components/portfolio/portfolio-*-tab.tsx` |
| Deep links | `frontend/lib/portfolio-health-links.ts` |
| Compliance links | `frontend/components/compliance/compliance-hub-links.tsx` |
| Sidebar | `frontend/components/sidebar.tsx` |
| Project scope chip | `frontend/lib/project-context.tsx`, `frontend/components/project-context-chip.tsx` |
| Redirects | `frontend/app/(app)/monitoring/page.tsx`, `intelligence/page.tsx` |

**What is already merged (foundation — do not redo)**

- `/portfolio-health` hub with five tabs (`overview`, `compliance`, `threats`, `monitoring`, `biodiversity`)
- Canonical href helpers and legacy redirects from `/monitoring` and `/intelligence`
- Compliance portfolio API + executive `CompliancePortfolioStrip`
- Monitoring feature depth (scan engine, history grids, SAR exports)

**What is not merged (this roadmap)**

- Shared tab shell and UI primitives
- Tab UI unification and Compliance circular-link fix
- Overview KPI drill-down (`onSelectTab` is passed but unused)
- Project scope sync (URL `?project=` vs topbar chip) across all tabs
- Navigation deduplication (Portfolio health vs Satellite vs Biodiversity vs Alerts)
- Monitoring progressive disclosure and Threats/Monitoring deduplication
- Full i18n + dark mode parity on tab bodies

---

## Problem summary

### Flow confusion

| Issue | Impact |
|-------|--------|
| Sidebar lists Portfolio health, Satellite, Biodiversity, Alerts as peers | Users don't know which entry point to use |
| Executive dashboard links Portfolio health and Satellite separately | Reinforces split mental model |
| `ComplianceHubLinks` on Compliance tab links back to same tab | Dead-end / circular navigation |
| `?project=` only filters Monitoring tab | Project chip feels broken on other tabs |
| Threats and Monitoring both show SAR/NDVI/fusion data | Duplicate tables, unclear ownership |
| Alerts appear in Overview, Monitoring, and `/alerts` | Fragmented inbox |

### UI inconsistency

| Issue | Impact |
|-------|--------|
| Compliance has unique hub-links grid; Biodiversity has gradient hero | Tabs feel like different products |
| Section headers mix `font-medium` and `text-lg font-medium` | Weak visual hierarchy |
| KPI grid is 4 columns except Biodiversity (3) | Layout jumps between tabs |
| CTAs mix `btn-primary`, text links, border buttons, pill chips | No single action language |
| Loading/error: plain text vs retry vs `EmptyState` | Unpolished, uneven trust |
| Tab copy mostly hardcoded English; hub shell is translated | i18n gap |
| Dark mode only on Biodiversity tab | Theme breakage |

---

## Success criteria (program exit)

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | New user from dashboard understands next step in <10s | Manual walkthrough on Overview |
| 2 | All five tabs share shell, banners, sections, KPI grid, states | Side-by-side screenshots |
| 3 | Overview KPIs drill into correct tab or alerts | Click test |
| 4 | Compliance tab has no self-referential link | Manual + unit test on `omitPortfolio` |
| 5 | Project chip and `?project=` stay in sync on `/portfolio-health` | Select chip → URL updates; deep link → chip updates |
| 6 | All tabs respect project scope when set | Filtered tables + scope banner |
| 7 | Monitoring first screen ≤ ~2 viewports; advanced SAR collapsed | Laptop walkthrough |
| 8 | No duplicate fusion table on Threats | Code review + UI check |
| 9 | `en.json` and `hi.json` keys match for `portfolioTabs.*` | Key parity script or manual diff |
| 10 | Deep links `?tab=`, `/monitoring`, `/intelligence` still work | Automated href tests |

---

## Phase overview

```
Phase 1  Shell + Overview (PR1)     ← START HERE
    ↓
Phase 2  All tabs unified (PR2)
    ↓
Phase 3  Scope + navigation (PR3)
    ↓
Phase 4  Monitoring tier + polish (PR4)
```

| Phase | Branch | PR title (draft) | Risk |
|-------|--------|------------------|------|
| 1 | `cursor/portfolio-health-shell-f2ba` | feat(portfolio): shared tab shell and overview drill-down | Low |
| 2 | `cursor/portfolio-health-tabs-f2ba` | feat(portfolio): unify all tabs on shared shell | Medium |
| 3 | `cursor/portfolio-health-scope-nav-f2ba` | feat(portfolio): project scope sync and nav cleanup | Medium |
| 4 | `cursor/portfolio-health-monitoring-f2ba` | feat(portfolio): monitoring tiering and threats dedup | Low–medium |

**Backend changes:** None required for Phases 1–4 (client-side filter where needed).
Optional later: `project_id` query param on `compliance.portfolioSummary` and
`intelligence.summary` for performance at scale.

---

## Design system contract

New components live under `frontend/components/portfolio/`.

### `PortfolioTabShell`

- Tab intro (`portfolioTabs.{tab}.intro`)
- Optional scope banner when `projectId` set
- Optional actions slot (right-aligned CTAs)
- Standard `space-y-6` wrapper

### `PortfolioTabBanner`

Variants: `info` | `scope` | `warn` | `cta` — single border/background system, dark-mode safe.

### `PortfolioSection`

Unified section chrome: title, description, optional icon, optional action link, `flush` mode for tables.

### `PortfolioKpiGrid` + `PortfolioKpiCard`

- Always `lg:grid-cols-4`
- `href` and/or `onClick` for drill-down
- Consistent warn styling

### `PortfolioTabState`

- `PortfolioTabLoading` — skeleton KPIs + section
- `PortfolioTabError` — message + retry on every tab

### `PortfolioRelatedLinks` (Phase 3)

Overview-only strip: compliance, monitoring, reports, satellite, biodiversity, alerts.

### `ComplianceHubLinks` change (Phase 2)

Add `omitPortfolio?: boolean` — when true, hide link to `portfolioComplianceHref()`.

---

## Phase 1 — Shell & Overview

**Goal:** Introduce primitives; prove integration on Overview only.

### Deliverables

1. i18n namespace `portfolioTabs` in `en.json` and `hi.json`
2. New files:
   - `portfolio-tab-shell.tsx`
   - `portfolio-tab-banner.tsx`
   - `portfolio-section.tsx`
   - `portfolio-kpi-grid.tsx`
   - `portfolio-tab-state.tsx`
   - `portfolio/index.ts` (barrel)
3. Extend `portfolio-kpi-card.tsx` with `href` / `onClick`
4. Migrate `portfolio-overview-tab.tsx` to shell
5. Wire Overview KPI drill-down:

   | KPI | Action |
   |-----|--------|
   | Trees | `/trees` |
   | Open violations | `onSelectTab("compliance")` |
   | Sites needing scan | `onSelectTab("monitoring")` |
   | Unread alerts | `alertsHref()` |

6. Tests: `portfolio-health-shell.test.tsx`
7. Pass `projectId` from hub to Overview (name optional in Phase 1)

### Out of scope

- Other tabs, sidebar, project chip sync, nav deduplication

### Exit criteria

- [ ] Primitives exported and documented in PR
- [ ] Overview clickable KPIs work
- [ ] Loading uses skeleton on Overview
- [ ] `npm test -- portfolio-health-shell nav-phase` passes
- [ ] Screen recording of Overview drill-down attached to PR

### Commits (suggested)

1. `feat(portfolio): add tab shell primitives and portfolioTabs i18n`
2. `feat(portfolio): migrate overview to shell with clickable KPIs`
3. `test(portfolio): add shell component tests`

---

## Phase 2 — Unify all tabs

**Goal:** Same shell on every tab; fix Compliance circular link; i18n tab bodies.

### Deliverables

1. Expand `portfolioTabs.*` for compliance, threats, monitoring, biodiversity strings
2. Migrate each tab (one commit per tab recommended):

   | Tab | Key changes |
   |-----|-------------|
   | Compliance | `PortfolioTabShell`; `ComplianceHubLinks omitPortfolio`; priority actions → warn banner |
   | Threats | Shell; `PortfolioTabState` error retry; all sections → `PortfolioSection` |
   | Monitoring | Shell; intro + scope banners; sections wrapped (keep full content for now) |
   | Biodiversity | Remove gradient hero → `cta` banner; 4-col KPI grid; `PortfolioSection` for sites list |

3. Hub passes `projectId` / `projectName` to all tabs
4. Each tab owns its `PortfolioTabShell` wrapper

### Exit criteria

- [ ] Side-by-side screenshots: five tabs look like one module
- [ ] No "Portfolio compliance" card on Compliance tab
- [ ] All tabs: skeleton loading + error retry
- [ ] Biodiversity: 4 KPI columns, no unique gradient hero
- [ ] EN/HI keys for all visible tab strings

### Out of scope

- URL ↔ chip sync, sidebar changes, monitoring accordion

---

## Phase 3 — Project scope & navigation

**Goal:** One project scope; cleaner wayfinding.

### Deliverables

1. **Scope sync** in `portfolio-health-hub.tsx`:

   ```
   effectiveProjectId = searchParams.project ?? context.projectId ?? null
   ```

   - Deep link `?project=X` → set context chip
   - Chip change on portfolio page → `router.replace(portfolioHealthHref(tab, { projectId }))`
   - Clear chip → remove `?project=` from URL

2. **Client-side filter** on all tabs when `effectiveProjectId` set (see filter table below)

3. **`portfolio-related-links.tsx`** on Overview only

4. **Executive dashboard** (`executive-dashboard.tsx`): remove duplicate Satellite quick action vs Portfolio health

5. **Sidebar** (`sidebar.tsx`): clarify labels (soft fix). Optional feature flag `nav_intelligence_v2` to hide Satellite/Bio from top-level nav (hard fix — product decision).

### Per-tab project filter

| Tab | Filter on |
|-----|-----------|
| Overview | `attentionProjects` by `id` |
| Compliance | `data.projects` |
| Threats | `threat_sites`, `weather_alerts`, `pest_hotspots` by `project_id` |
| Monitoring | existing `projectId` prop |
| Biodiversity | fence items by project when field exists |

Show `PortfolioTabBanner variant="scope"` on every tab when filtered.

### Exit criteria

- [ ] Chip and URL stay in sync on `/portfolio-health`
- [ ] All tabs show scope banner and filtered data
- [ ] Overview has Related surfaces strip
- [ ] Dashboard quick actions deduplicated
- [ ] `nav-phase-c.test.ts` updated if helpers change

---

## Phase 4 — Monitoring tiering & polish

**Goal:** Reduce cognitive load; remove duplicate content; theme parity.

### Deliverables

1. **Monitoring tiers** (`portfolio-monitoring-tab.tsx`):

   | Tier | Content | Default |
   |------|---------|---------|
   | 1 | KPIs, alert chips, work-area table (cap 15 rows), CTA → `/satellite` | Visible |
   | 2 | SAR field verifications, compact scan-engine line | Visible |
   | 3 | ScanCyclePanel, ScanHistoryGrid, TreeScanHistoryGrid, jobs, exports | Collapsed `<details>` |

   Persist open state: `localStorage` key `portfolio_monitoring_advanced_open`.

2. **Threats dedup** (`portfolio-threats-tab.tsx`):
   - Remove full Sentinel+Bhoonidhi fusion table
   - Add summary line + link to `portfolioMonitoringHref(projectId)`

3. **Alerts consistency**: all alert chips use `alertsHref({ ... })` with consistent filters

4. **Dark mode** on all portfolio primitives and tab content

5. **Optional:** Compliance KPI cards link like `CompliancePortfolioStrip` (href on KPIs)

### Content ownership (final)

| Tab | Owns |
|-----|------|
| Threats | Weather, pest, early warnings, integration health, composite risk, threat watch sites |
| Monitoring | Scan cadence, NDVI/SAR ops, alerts by kind, field verifications, fusion detail, job logs |

### Exit criteria

- [ ] Monitoring first screen ≤ ~2 viewports on 1440×900
- [ ] Advanced section collapsed by default
- [ ] No fusion grid on Threats
- [ ] Dark mode spot-check on all tabs
- [ ] Full walkthrough video for PR

---

## Testing strategy

### Automated (every phase)

```bash
cd frontend && npm test -- portfolio-health-shell nav-phase
```

| Phase | Add tests for |
|-------|----------------|
| 1 | KPI href/onClick; banner scope variant |
| 2 | `ComplianceHubLinks` with `omitPortfolio` |
| 3 | Scoped href helpers; scope sync behavior if unit-testable |
| 4 | Optional: monitoring accordion default closed (DOM test) |

### Manual (required before merge)

1. Login as org admin (satellite feature flag on)
2. Visit `/portfolio-health` — all tabs load
3. Overview KPI clicks → correct tab or `/alerts`
4. Compliance — no circular link (Phase 2+)
5. Project chip ↔ URL (Phase 3+)
6. `/monitoring` and `/intelligence` redirects
7. EN ↔ HI locale switch
8. Dark mode (Phase 4)

### Regression targets

- `CompliancePortfolioStrip` → `?tab=compliance`
- `project-module-links.tsx` monitoring/compliance hrefs
- SAR field task deep links → `/satellite`

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Large Phase 2 PR | One tab per commit; review tab-by-tab |
| Sidebar demotion upsets power users | Soft label fix first; hard hide behind `nav_intelligence_v2` |
| Client filter wrong on sparse APIs | Scope banner + note when metric is portfolio-wide only |
| Monitoring accordion hides failed jobs | Badge on accordion when `recent_jobs` has errors |
| HI translation lag | Block Phase 2 merge until key parity with EN |

---

## File touch map (all phases)

```
frontend/components/portfolio/
  portfolio-health-hub.tsx          Phases 1–3
  portfolio-overview-tab.tsx        Phases 1–3
  portfolio-compliance-tab.tsx      Phase 2
  portfolio-threats-tab.tsx         Phases 2, 4
  portfolio-monitoring-tab.tsx      Phases 2, 4
  portfolio-biodiversity-tab.tsx    Phase 2
  portfolio-kpi-card.tsx            Phase 1
  portfolio-tab-shell.tsx           Phase 1 NEW
  portfolio-tab-banner.tsx          Phase 1 NEW
  portfolio-section.tsx             Phase 1 NEW
  portfolio-kpi-grid.tsx            Phase 1 NEW
  portfolio-tab-state.tsx           Phase 1 NEW
  portfolio-related-links.tsx       Phase 3 NEW
  portfolio/index.ts                Phase 1 NEW
  portfolio-health-shell.test.tsx   Phases 1–3

frontend/components/compliance/compliance-hub-links.tsx   Phase 2
frontend/components/sidebar.tsx                         Phase 3
frontend/components/dashboard/executive-dashboard.tsx   Phase 3
frontend/messages/en.json, hi.json                      Phases 1–4
```

---

## Decision log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PR count | 4 phases = 4 PRs | Reviewable chunks, clear rollback |
| Start with | Phase 1 only | Primitives before tab migration |
| Nav hard vs soft | Soft first (labels) | Lower breakage; flag for hard hide |
| Backend scope filter | Defer | Client filter sufficient for MVP |
| Biodiversity CTA | `cta` banner not `btn-primary` | One primary action style across tabs |
| Fusion table home | Monitoring only | Ops ownership; Threats stays risk-focused |

---

## Quick start (Phase 1 today)

```bash
git fetch origin main && git checkout main && git pull origin main
git checkout -b cursor/portfolio-health-shell-f2ba
```

1. Add `portfolioTabs` to `en.json` / `hi.json`
2. Create shell primitives (banner → section → kpi-grid → tab-state → shell)
3. Migrate Overview + wire KPI drill-down
4. Add tests, push, open draft PR

---

## References

- Audit discussion: Portfolio Health flow + UI consistency (Sep 2026)
- Existing nav consolidation: `ffbb31a` (Phase B compliance hub), `7169951` (Phase C link helpers)
- Compliance strip: PR #238 (`CompliancePortfolioStrip`)
