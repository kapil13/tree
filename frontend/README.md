# BYOT Frontend (Next.js 15)

```bash
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL + Google Maps API key
npm install
npm run dev                     # http://localhost:3000
```

## Stack
* Next.js 15 (App Router, React 19)
* TypeScript, Tailwind CSS, shadcn-style components
* TanStack Query, Zustand, Axios, Zod
* Google Maps (`@vis.gl/react-google-maps`), Recharts, lucide-react

## Google Maps setup (local Mac)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps JavaScript API**
3. Create an API key (restrict to HTTP referrers `http://localhost:3000/*` for dev)
4. Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here
```

Restart `npm run dev` after changing env vars.

## Layout
```
app/
├── page.tsx                  # marketing landing
├── login/, signup/           # auth
└── (app)/                    # authenticated app shell
    ├── layout.tsx            # sidebar + topbar
    ├── dashboard/            # KPIs, charts
    ├── trees/, trees/new/, trees/[id]/
    ├── map/                  # Google Maps (roadmap) with tree pins
    ├── satellite/            # Google satellite imagery + tree pins
    ├── alerts/, reports/
    ├── assistant/            # AI chat
    └── settings/
components/                   # Sidebar, Topbar, TreesMap
lib/                          # api client, auth store, cn helper
```
