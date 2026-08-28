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
- **Stack routes** (`stackRouteScaffold`) — drawer persists on push routes: Add tree, Bioacoustic, Assistant, Reports, etc.

## Primary field actions

- **Home hero card** — `PrimaryFieldActions`: full-width “Register a tree” + Bioacoustic / Projects tiles
- **Extended FAB** — “Add” opens bottom sheet (`showAddActionSheet`) for Register tree + Bioacoustic
- **Drawer footer** — quick Register tree + Bioacoustic buttons

## Add tree wizard (Phase 3)

Five-step flow in `add_tree_screen.dart`:

1. Context — program / project / work area
2. Species & details — segment fields, optional measurements
3. Location — GPS + compliance banner
4. Photos — camera capture with offline queue
5. Review & save — summary + register / save & next

## Bioacoustic record mode (Phase 4)

- **Record / History tabs** on `bioacoustic_screen.dart`
- **Full-screen overlay** while recording (timer + stop)
- Offline queue + sync on History tab

## Profile

- Feature links removed from profile scroll (now in drawer only)
- Profile retains identity, programs, language, security, sign out

## Files

| File | Role |
|------|------|
| `lib/src/nav_groups.dart` | Drawer IA + RBAC |
| `lib/src/widgets/app_drawer.dart` | Drawer UI |
| `lib/src/widgets/shell_scaffold.dart` | Menu button, FAB |
| `lib/src/widgets/stack_route_scaffold.dart` | Drawer on stack routes |
| `lib/src/widgets/primary_field_actions.dart` | Home primary tiles |
| `lib/src/widgets/add_action_sheet.dart` | Add hub bottom sheet |
| `lib/src/widgets/app_shell.dart` | Drawer + FAB wiring |
| `lib/src/screens/add_tree_screen.dart` | Multi-step registration wizard |
| `lib/src/screens/bioacoustic_screen.dart` | Record-first biodiversity UI |

## APK build

Push to `cursor/mobile-nav-redesign-f2ba` triggers `.github/workflows/android-apk.yml`. Download artifact `aranyix-android-apk` from the workflow run.
