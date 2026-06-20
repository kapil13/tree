# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **BYOT — "Bring Your Own Tree"** monorepo: a FastAPI backend
(`backend/`), a Next.js 15 web app (`frontend/`), a Flutter app (`mobile/`),
and infra (`infrastructure/`). Day-to-day dev uses the backend + frontend.

The dependency-refresh layer (pip/npm installs) is handled by the startup update
script. System packages (PostgreSQL 16 + PostGIS, Redis, `python3.12-venv`) are
installed in the VM snapshot. The notes below are the non-obvious startup/run
caveats — standard commands live in `README.md` and the `Makefile`.

### Starting the data services (no systemd in this VM)
PostgreSQL and Redis are installed but are NOT auto-started. Start them once per
session:

```bash
sudo pg_ctlcluster 16 main start
sudo redis-server /etc/redis/redis.conf --daemonize yes
```

- DB role/database: `byot` / `byot` (password `byot`, superuser), database `byot`,
  reachable at `localhost:5432`. This is created in the snapshot already; if a
  fresh cluster ever lacks it, recreate with
  `sudo -u postgres psql -c "CREATE ROLE byot LOGIN PASSWORD 'byot' SUPERUSER" && sudo -u postgres createdb -O byot byot`.

### Backend (FastAPI) — port 8000
- Python deps live in `backend/.venv` (created by the update script).
- Requires `backend/.env` (gitignored). It must point at **localhost** (the
  committed `.env.example` points at docker-compose hostnames `postgres`/`redis`/
  `minio`, which do NOT resolve when running natively). Minimum overrides:
  `DATABASE_URL=postgresql+asyncpg://byot:byot@localhost:5432/byot`,
  `DATABASE_URL_SYNC=postgresql+psycopg2://byot:byot@localhost:5432/byot`,
  `REDIS_URL=redis://localhost:6379/0`, and leave `S3_ENDPOINT_URL` empty.
- Migrate + seed (run from `backend/`):
  `.venv/bin/alembic upgrade head` then `.venv/bin/python -m app.scripts.seed_demo`.
- Run (dev, hot reload): `.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
- Seeded demo login: `demo@byot.earth` / `byotdemo1234!`.
- Tests: `cd backend && .venv/bin/pytest -q`.

### Frontend (Next.js) — port 3000
- Requires `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
  Without it the axios client falls back to baseURL `/api` and every backend call
  hits the Next.js server instead of FastAPI (login/dashboard silently fail).
- Run (dev): `cd frontend && npm run dev`. Typecheck: `npm run typecheck`.
- The map page needs `NEXT_PUBLIC_MAPBOX_TOKEN`; it is optional and the rest of
  the app works without it.

### Known caveats
- **Backend lint is broken as committed**: `pyproject.toml` ignores ruff rule
  `UP046`, which does not exist in the pinned `ruff==0.6.8` (added in a later
  ruff release), so `make lint` / `ruff check .` aborts with
  "Unknown rule selector: UP046". Fix requires bumping ruff or dropping that
  ignore entry — out of scope for environment setup. Frontend lint/typecheck work.
- MinIO/S3 is **not** run locally; image-upload/storage features degrade but the
  API and the register/login/tree flows work without it.
- Redis is optional at runtime (the rate limiter degrades gracefully if Redis is
  down) but is installed and recommended.
