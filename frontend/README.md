# BYOT Frontend (Next.js 15)

```bash
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL + Mapbox token
npm install
npm run dev                     # http://localhost:3000
```

## Stack
* Next.js 15 (App Router, React 19)
* TypeScript, Tailwind CSS, shadcn-style components
* TanStack Query, Zustand, Axios, Zod
* Mapbox GL JS, Recharts, lucide-react

## Layout
```
app/
├── page.tsx                  # marketing landing
├── login/, signup/           # auth
└── (app)/                    # authenticated app shell
    ├── layout.tsx            # sidebar + topbar
    ├── dashboard/            # KPIs, charts
    ├── trees/, trees/new/, trees/[id]/
    ├── map/                  # Mapbox visualization
    ├── satellite/, alerts/, reports/
    ├── assistant/            # AI chat
    └── settings/
components/                   # Sidebar, Topbar
lib/                          # api client, auth store, cn helper
```
