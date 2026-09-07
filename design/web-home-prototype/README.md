# Aranyix Command Center — Visual Dashboard Prototype

HTML prototype for the **Program Manager operational dashboard**. Visual-first: maps, charts, gauges, queues — not narrative text.

**Awaiting:** `APPROVED — IMPLEMENT WEB` for production implementation.

## Preview

```bash
cd design/web-home-prototype && python3 -m http.server 8765
```

## Design principle

**SEE → UNDERSTAND → EXPLORE → ACT**

First viewport contains portfolio health, spatial map, priority queue, KPI sparklines, and delta chips. Monitoring trends, bio/carbon/MRV, and activity timeline follow below.

## Interactions

| Action | Effect |
|--------|--------|
| Project filter / map zone / project chip | Updates all charts, map, queue |
| Map pin | Highlights NDVI/satellite charts, updates context |
| Alert row | Highlights map location, toast action |
| Layer toggles | Health, NDVI heatmap, alerts, satellite, bio, field |
| Chart hover | Tooltip with exact values |
| MRV stage click | Toast to workflow module |

## Deploy to aranyix.tech

```bash
cd /opt/aranyix && git pull origin main
mkdir -p frontend/public/design/web-home-prototype
cp -r design/web-home-prototype/* frontend/public/design/web-home-prototype/
cd infrastructure/hostinger && FORCE_FRONTEND_REBUILD=1 ./deploy.sh
```

https://aranyix.tech/design/web-home-prototype/index.html
