# Aranyix Mobile Design System

**Version:** 1.0 (prototype)  
**Direction:** Forest Intelligence — premium, calm, data-driven, field-ready

---

## 1. Design principles

1. **Content over chrome** — reduce cards, pills, decorative green
2. **Typography carries hierarchy** — not color alone
3. **Imagery is evidence** — tree photos, maps, satellite thumbnails
4. **Field-safe** — 48px min touch targets, high contrast in sunlight
5. **Semantic color only** — green = brand + positive; not backgrounds everywhere

---

## 2. Color

### Brand
| Token | Hex | Usage |
|-------|-----|-------|
| `--brand-forest` | `#0B3D2E` | Brand mark, primary actions |
| `--brand-canopy` | `#15803D` | Active states, links |
| `--brand-moss` | `#3D7A57` | Secondary accents |

### Neutrals (primary surfaces)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-app` | `#F7F8F6` | App background |
| `--bg-surface` | `#FFFFFF` | Cards, sheets |
| `--bg-elevated` | `#FFFFFF` | Modals |
| `--bg-subtle` | `#EEF1EE` | Dividers, inset areas |
| `--text-primary` | `#0F1410` | Headlines, body |
| `--text-secondary` | `#5C665E` | Captions, meta |
| `--text-tertiary` | `#8A938C` | Placeholders |
| `--border` | `#DDE2DC` | Hairlines |
| `--border-strong` | `#B8C0B8` | Focus rings |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `--status-ok` | `#15803D` | Verified, synced, healthy |
| `--status-warn` | `#B45309` | Stale scan, due survey |
| `--status-danger` | `#B91C1C` | Critical alert, failed sync |
| `--status-info` | `#1D4ED8` | Informational |
| `--status-offline` | `#6B7280` | Offline mode |

### Data visualization
| Token | Usage |
|-------|-------|
| `--ndvi-high` | `#15803D` |
| `--ndvi-mid` | `#CA8A04` |
| `--ndvi-low` | `#B91C1C` |
| `--map-overlay` | `rgba(11,61,46,0.12)` |

**Removed:** full-screen green gradients, green card backgrounds, green pill badges everywhere.

---

## 3. Typography

**Font:** `DM Sans` (UI) + `IBM Plex Mono` (codes, coordinates, IDs)

| Style | Size | Weight | Line | Usage |
|-------|------|--------|------|-------|
| Display | 28px | 600 | 1.2 | Screen titles |
| Title | 20px | 600 | 1.3 | Section headers |
| Headline | 17px | 600 | 1.35 | Card titles |
| Body | 15px | 400 | 1.5 | Primary text |
| Body strong | 15px | 600 | 1.5 | Emphasis |
| Caption | 13px | 400 | 1.4 | Meta, timestamps |
| Micro | 11px | 500 | 1.3 | Badges, labels |
| Mono | 13px | 400 | 1.4 | Tree codes, GPS |

---

## 4. Spacing (4px grid)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |

Screen horizontal padding: **16px**  
Section gap: **24px**  
List item padding: **12px vertical, 16px horizontal**

---

## 5. Radius & elevation

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Chips, inputs |
| `--radius-md` | 10px | Buttons, thumbnails |
| `--radius-lg` | 14px | Cards |
| `--radius-xl` | 20px | Bottom sheets |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` | Cards |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Sheets, FAB |

**Reduced from current:** 22px card radius → 14px max for data density.

---

## 6. Components

### Buttons
- **Primary:** forest bg, white text, 48px height, radius-md
- **Secondary:** white bg, border, forest text
- **Ghost:** text only, for toolbar
- **Destructive:** danger outline
- **FAB:** 56px, forest, icon only — Register tree on Field/Map

### Inputs
- 48px height, border-only (no filled green tint)
- Label above, helper below
- Error state: danger border + caption

### Lists
- Compact rows, 56–72px height
- Leading: photo thumbnail 48px or status dot
- Trailing: chevron or action icon
- Dividers: inset hairline, not card-per-row

### Cards
- Use sparingly — prefer flat lists with section headers
- **Decision cards** on Home/Monitor: left severity stripe, title, meta, CTA

### Tree photo components
- **Grid cell:** 1:1 crop, radius-md, status overlay bottom-left
- **List row:** 56px thumbnail, code + species + project + sync icon
- **Hero:** 16:9 on detail, pinch-to-zoom in implementation
- **Missing:** neutral placeholder with tree icon + “No photo”
- **Broken:** retry affordance
- **Loading:** skeleton shimmer

### Navigation
- Bottom bar: 64px + safe area, icon + micro label
- Active: forest icon + label; inactive: tertiary
- App bar: 56px, project chip left, sync badge right
- Back: chevron + contextual title (not “Back”)

### Status indicators
| State | Visual |
|-------|--------|
| Synced | green dot |
| Pending | amber clock |
| Failed | red alert + retry |
| Offline | gray cloud |
| Verified | check badge on photo |
| At risk | amber stripe on card |

### Sheets & dialogs
- Bottom sheet for filters, project picker, map object actions
- Full-screen sheet for alert detail on mobile
- Confirm dialogs: title, one sentence, primary/secondary

### Map
- Full-bleed map, floating controls (layers, locate, filter)
- Bottom sheet for selected tree/work area
- Minimal chrome — map is the UI

### Charts (Monitor)
- Sparklines for NDVI trend
- No decorative chart chrome — label + number + trend arrow

---

## 7. Iconography

- Stroke icons, 24px default, 20px compact
- Semantic colors only on status icons
- No oversized decorative icons in empty states (max 48px)

---

## 8. Motion

- Screen transitions: 200ms ease-out slide
- Sheet: 250ms spring
- Skeleton: subtle pulse
- No gratuitous animations in field flows

---

## 9. Accessibility

- Min contrast 4.5:1 body text
- Touch targets ≥ 48px
- Support dynamic type (scale to 1.3x in implementation)
- Hindi (hi) — same layout, not truncated labels in prototype

---

## 10. CSS implementation

See `/design/prototypes/css/design-system.css` for prototype tokens.
