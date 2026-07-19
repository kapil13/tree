# Phase 2 — Field Operations (NHAI + Mines + Societies)

Phase 2 delivers end-to-end **field registration** on mobile with the same compliance strictness as web, multi-contractor project teams, offline sync, and a supervisor dashboard.

## Slices delivered

| Slice | Scope |
|-------|--------|
| **2.1** | Mobile project list, work-area picker, `work_area_id` on tree create, compliance preview |
| **2.2** | NHAI: LHS/RHS, guard type, pit size, chainage from compliance check |
| **2.3** | Mines: approved species list, density shown per work area |
| **2.4** | Societies: guided mode, block code from work-area `segment_code` |
| **2.5** | Offline tree registration queue + sync on reconnect |
| **2.6** | Web `/field-ops` supervisor dashboard, violations column on projects list, MRV segment report |

## Mobile flow

1. **Home → Field projects** — list assigned projects (org member or contractor assignment).
2. Open project → pick work area → **Register tree**.
3. Capture GPS → compliance check runs automatically.
4. **Strict mode** blocks save when compliance fails (same as web).
5. If offline, registration is queued and synced when connectivity returns.

## Multi-contractor roles

| Role | Access |
|------|--------|
| `field_worker` | Assigned projects/work areas; register trees |
| `field_supervisor` | Above + resolve violations, manage team members |

Assign contractors via API:

```http
POST /api/v1/planting-projects/{id}/members
{
  "user_id": "<uuid>",
  "role": "field_worker",
  "contractor_name": "NHAI Package 3 — ABC Infra",
  "work_area_ids": ["<work-area-uuid>"]
}
```

## Supervisor web

- **Field ops** (`/field-ops`) — portfolio KPIs, project health table, recent violations.
- **Projects** — open violations column; per-project compliance tab + MRV export unchanged.

## Deploy notes

After pull, run migrations:

```bash
docker compose exec backend alembic upgrade head
```

Rebuild **backend**, **frontend**, and ship a new **mobile APK** for field teams.
