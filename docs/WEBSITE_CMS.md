# Website CMS (Platform Admin)

Platform administrators (`role = admin`) can manage the public marketing site at [aranyix.tech](https://aranyix.tech/) without redeploying code.

## Admin UI

- **URL:** `/platform/cms` (requires sign-in as platform admin)
- **Settings shortcut:** Settings → Website CMS (admin only)
- **Sidebar:** Website CMS link (admin only)

### Capabilities

| Area | What you can edit |
|------|-------------------|
| Header | Nav links, Sign in / Get started labels and URLs |
| Footer | Description, badge, copyright, legal note, link columns |
| Pages | Create, publish, delete custom pages at `/p/{slug}` |
| Homepage | Edit sections on the home page (hero, features, CTA, etc.) |
| Sections | Add, reorder, enable/disable, edit JSON content per section |

## API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/public/site` | Public | Homepage + header/footer |
| `GET /api/v1/public/pages/{slug}` | Public | Custom published page |
| `GET/PUT /api/v1/platform/cms/site/{header\|footer}` | Admin | Site config |
| `GET/POST/PATCH/DELETE /api/v1/platform/cms/pages` | Admin | Page CRUD |
| `POST/PATCH/DELETE /api/v1/platform/cms/sections` | Admin | Section CRUD |

## Database

Migration: `0019_cms_site_content`

```bash
docker compose exec backend alembic upgrade head
# expect: 0019_cms_site_content (head)
```

On first API access, the CMS auto-seeds with the current aranyix.tech homepage content.

## Grant platform admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## Section types

`hero`, `features`, `compliance`, `programs`, `steps`, `platform_preview`, `cta`, `rich_text`

Section content is JSON — use the admin preview panel or edit fields to match the renderer in `frontend/components/marketing/cms-section-renderer.tsx`.
