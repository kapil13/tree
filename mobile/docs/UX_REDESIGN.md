# Mobile UX Redesign (2026)

## Navigation

- **Left drawer** (`AppDrawer`) — grouped menu mirroring web sidebar:
  - Overview → Dashboard
  - Setup & planting → Projects, Trees, Map, Field ops
  - Monitoring & analysis → Monitoring, Bioacoustic, Alerts
  - Reports & evidence → Reports, AI assistant, Carbon, Credits
  - Account → Profile
- **Hamburger** on all shell screens via `ShellTopBar` / home top bar
- **Bottom tabs** unchanged by role (Home, Trees/Monitoring, Map/Projects, Alerts/Profile)

## Primary field actions

- **Home hero card** — `PrimaryFieldActions`: full-width “Register a tree” + Bioacoustic / Projects tiles
- **Extended FAB** — “Add” opens bottom sheet (`showAddActionSheet`) for Register tree + Bioacoustic
- **Drawer footer** — quick Register tree + Bioacoustic buttons

## Profile

- Feature links removed from profile scroll (now in drawer only)
- Profile retains identity, programs, language, security, sign out

## Files

| File | Role |
|------|------|
| `lib/src/nav_groups.dart` | Drawer IA + RBAC |
| `lib/src/widgets/app_drawer.dart` | Drawer UI |
| `lib/src/widgets/shell_scaffold.dart` | Menu button, FAB |
| `lib/src/widgets/primary_field_actions.dart` | Home primary tiles |
| `lib/src/widgets/add_action_sheet.dart` | Add hub bottom sheet |
| `lib/src/widgets/app_shell.dart` | Drawer + FAB wiring |

## Next phases (not in this PR)

- Add tree multi-step wizard split
- Full-screen bioacoustic record mode
- Nested shell so drawer persists on `/trees/new` stack routes
