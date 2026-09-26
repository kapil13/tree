# Aranyix Mobile UX Decisions

**Version:** 1.0  
**Status:** Prototype — awaiting approval

---

## 1. Why this navigation

### Decision: Home · Map · Field · Monitor · More

**Rationale:**
- **Map** is first-class for a GIS/MRV product — removed from drawer-only access for professionals
- **Field** consolidates capture workflows (register, survey, bioacoustic) — answers “what am I doing?”
- **Monitor** separates intelligence from operations — supervisors need both, not mixed on Home
- **More** replaces 14-item drawer — mobile users need shallow primary nav, deep secondary

**Rejected:** Keeping Trees as bottom tab — trees are the primary *object* but not the primary *mode*; registry lives under Field.

**Rejected:** Alerts as bottom tab — alerts are important but secondary to map + capture; surfaced via badges + Monitor.

---

## 2. Drawer item decisions

| Item | Decision | Reason |
|------|----------|--------|
| Dashboard | → **Home** | Rename; operational brief not analytics dashboard |
| Projects | → **More** + **context chip** | Workspace, not daily navigation |
| Trees | → **Field → Registry** | Photo-centric list with search |
| Map | → **Bottom tab** | Spatial first-class |
| Field Ops | → **Home actions** + **Field queue** | Tasks not destination |
| Monitoring | → **Monitor tab** | Decision cards not metrics dump |
| Bioacoustic | → **Field hub** | Capture workflow |
| Alerts | → **Monitor → Inbox** | Actionable operational info |
| Reports | → **More** | Infrequent, document-oriented |
| Assistant | → **More → Tools** | Utility |
| Carbon | → **More** | Read-heavy, secondary |
| Credits | → **More** (supervisor+) | Governance, not field |
| Profile | → **More → Account** | Standard |

---

## 3. Tree registration — information architecture

### New flow: 3 steps (not 5)

#### Step 1 — **Place & context**
**Captured automatically:**
- GPS coordinates + accuracy
- Work area inference from GPS (compliance pre-check API)
- Project context from workspace chip (if set)
- Timestamp

**User provides (only if needed):**
- Confirm/adjust location on map (if accuracy poor)
- Chainage (NHAI schemes only — shown when `registration-context` requires)

**Hidden:**
- Raw lat/long fields
- Program codes (from enrollment)
- Internal scheme metadata

#### Step 2 — **Evidence**
**User provides:**
- Photos (camera first — min count from scheme rules)
- Optional: survival status if re-survey (different flow)

**Captured automatically:**
- EXIF GPS from photos
- Photo hash for duplicate detection

**Deferred:**
- DBH, height, canopy — **not at registration** unless scheme `registration-context` marks required
- Species text — optional quick pick; AI suggestion runs after photo

#### Step 3 — **Confirm & submit**
**Shown:**
- Photo strip, map pin, work area name, compliance result (pass/warn/block)
- Species: suggested + confirm/edit (single field, searchable)
- Sync status: “Will upload when online” or “Submitting…”

**User confirms:**
- Submit button

**Post-submit:**
- Success → tree detail OR “register next” in same work area
- Offline → queue with visible pending state

### Why not preserve current 5 steps
Current flow front-loads typing (species, DBH) before evidence — contradicts compliance (EXIF GPS) and field reality (hands dirty, bright sun, one-handed).

---

## 4. Tree registry — information hierarchy

### List item (priority order)
1. **Photo** (thumbnail)
2. **Tree code** (mono)
3. **Species** (or “Unidentified”)
4. **Status strip:** sync · health · verification
5. **Context:** project / work area (one line)
6. **Distance** (if sorting by proximity)

### Controls (from product need)
- Search: code, species
- Filter: project, work area, health, sync state, verification
- Sort: recent, code, proximity, health
- View: grid (default) / compact list

### Large datasets
- Virtualized list (implementation)
- Pagination from API (`page`, `bbox` for map viewport)
- Thumbnail lazy load + cache

---

## 5. What is automatically derived

| Data | Source |
|------|--------|
| Work area placement | GPS + `compliance-check` |
| Species suggestion | `species-suggestions` + optional AI after photo |
| Health / NDVI | Satellite pipeline (not shown at registration) |
| Carbon estimate | Post-registration async |
| Integrity risk | Backend fusion — shown on detail, not registration |
| Chainage suggestion | `registration-context` |
| Alert context | Alert payload + entity lookup |

---

## 6. What is intentionally hidden

| Hidden from field user | Why |
|------------------------|-----|
| `program_code`, internal IDs | Workspace context |
| Raw PostGIS / MGRS tiles | Technical |
| Credit ledger mechanics | Supervisor More tab |
| SAR provider names | Shown as “Radar health” in Monitor |
| Scan engine job names | Ops/platform only |
| RBAC permission strings | Enforced, not displayed |

---

## 7. What is deferred (out of registration)

- DBH / height / canopy (unless scheme mandates)
- Nickname / custom metadata
- Species ID from master list (optional confirm only)
- AI full analysis (async after submit)
- Carbon recalculation (background job)

---

## 8. Monitoring redesign

### Monitor tab structure
1. **Action required** (top) — cards with CTA
2. **Site health** — work areas stale scan, at-risk count
3. **Hazards** — fire/flood if applicable
4. **Trend** — NDVI sparkline per priority site

### Alert card answers
- What happened (plain language, not `kind` string)
- Severity (color stripe)
- Where (work area / tree + map link)
- When (relative time)
- What to do (recommended action button)

---

## 9. Map experience

### Layers (toggle)
- Trees (clustered)
- Work areas (polygons)
- Alerts (pins)
- My location

### Selected object sheet
- Tree: photo, code, health, actions (detail, survey, navigate)
- Work area: NDVI summary, last scan, monitoring link

### Field integration
- “Register tree here” from map long-press
- Pre-fills Step 1 location

---

## 10. Offline & sync UX

- **Header badge:** pending count
- **Home card:** “3 trees waiting to sync” + retry
- **Per-tree icon** in registry
- **Field register Step 3:** explicit offline message
- **Settings:** last sync time, clear failed queue (supervisor)

---

## 11. Persona variants

| Feature | Field worker | Supervisor | Citizen |
|---------|--------------|------------|---------|
| Monitor tab | Hidden | ✓ | Hidden |
| Credits | Hidden | ✓ | Hidden |
| Draw work area | Hidden | ✓ | Hidden |
| Bioacoustic | If professional org | ✓ | Hidden |
| AI analysis trigger | Hidden (API) | ✓ | ✓ (metered) |

---

## 12. Backend / API gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| `TreeListItem.thumbnail_url` | P1 | Photo-rich registry |
| Standardized alert schema | P1 | `entity_id`, `entity_type`, `recommended_action`, `deep_link` |
| `GET /mobile/field-brief` | P2 | Aggregated home screen |
| Mobile verifier attest UI | P3 | API exists |
| Plot visit screen | P2 | API exists, no mobile UI |
| On-device species hint | P3 | Nice-to-have |

---

## 13. Unresolved questions

1. Should **citizens** see a simplified Monitor (only their tree health) or remain Home-only?
2. Should **project chip** default to last-used or always “All projects” for multi-project supervisors?
3. **Grid vs list** default for tree registry — prototype uses grid; validate with users in high-volume CAMPA programmes.
4. **Hindi-first** field labels — copy review needed.
5. **Biometric lock** on every resume vs only after 5 min — security vs field friction.

---

## 14. Workflow → product process mapping

| Product process | Mobile surface |
|-----------------|----------------|
| Enroll programme | Signup / org onboarding |
| Set up project & work areas | More → Projects (supervisor); web-primary |
| Register tree evidence | Field → Register (3 steps) |
| Compliance placement | Automatic in Step 1 + confirm |
| Survival monitoring | Field → Survey / Home due list |
| Satellite monitoring | Monitor → site cards |
| Hazard response | Monitor → alert → map |
| Biodiversity | Field → Bioacoustic |
| MRV export | More → Reports |
| Carbon / credits | More → Carbon / Credits |
| AI Q&A | More → Assistant |
