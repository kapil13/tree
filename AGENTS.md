# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

**BYOT — "Bring Your Own Tree"**: a ClimateTech platform to register trees, monitor
health, estimate carbon, and generate reports. See `README.md` for the product
overview and `docs/` for architecture. The runnable app is two services:

| Service | Stack | Dir | Dev start command | Port |
|---|---|---|---|---|
| Backend API | FastAPI + SQLAlchemy (async) + Alembic | `backend/` | `cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000` | 8000 |
| Frontend | Next.js 15 (App Router) + Tailwind | `frontend/` | `cd frontend && npm run dev` | 3000 |

Infra dependencies: **PostgreSQL 16 + PostGIS** (port 5432) and **Redis 7** (6379).
Backend API docs at `http://localhost:8000/docs`; web app at `http://localhost:3000`.

> Note: the canonical `main` branch is an empty placeholder; the actual codebase
> lives on the platform-scaffold branch. This branch builds the dev environment on
> top of it.

### Starting services (no systemd on this VM)

Postgres and Redis are installed but must be started manually each fresh boot:

```bash
sudo pg_ctlcluster 16 main start
sudo redis-server /etc/redis/redis.conf --daemonize yes
```

First-time DB bootstrap (idempotent; only needed if the `byot` DB is absent):

```bash
sudo -u postgres psql -c "CREATE ROLE byot LOGIN PASSWORD 'byot' SUPERUSER;"  # ignore "already exists"
sudo -u postgres createdb -O byot byot
sudo -u postgres psql -d byot -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pg_trgm;'
cd backend && . .venv/bin/activate && alembic upgrade head && python -m app.scripts.seed_demo
```

Seed creates demo user `demo@byot.earth` / `byotdemo1234!` plus 25 trees and a
species catalog. `seed_demo` and the bootstrap above are safe to re-run.

### Required local env files (gitignored, NOT created by the update script)

- `backend/.env` — the committed `.env.example` uses Docker hostnames
  (`postgres`/`redis`/`minio`). For host-based dev, point URLs at `localhost`:
  `DATABASE_URL=postgresql+asyncpg://byot:byot@localhost:5432/byot`,
  `DATABASE_URL_SYNC=postgresql+psycopg2://byot:byot@localhost:5432/byot`,
  `REDIS_URL=redis://localhost:6379/0`. Alembic also reads `DATABASE_URL_SYNC`.
- `frontend/.env.local` — set `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
  (the axios client in `lib/api.ts` appends `/v1/...`; default fallback `/api` is
  wrong for host dev). Restart `next dev` after creating it.

### Non-obvious gotchas

- **npm install requires `--legacy-peer-deps`.** `frontend/package.json` uses a
  React 19 *RC* (pre-release), which fails the peer range of `@tanstack/react-query`.
  Plain `npm install` errors with `ERESOLVE`.
- **Lint / quality gates.** Backend: `cd backend && ruff check .` and `pytest -q`.
  The repo's `ruff` config selects rule `UP046`, which did not exist in the
  originally pinned `ruff==0.6.8` (made `ruff check` fail to parse `pyproject.toml`);
  `requirements-dev.txt` is bumped to a current ruff so lint runs. Frontend lint gate
  is `npm run typecheck` (this is what `make lint` runs); `npm run lint` (`next lint`)
  is **interactive** because the repo ships no ESLint config — avoid it in automation.
- **`Makefile` targets assume Docker Compose** (`infrastructure/docker-compose.yml`).
  Docker is not installed here; run the services directly on the host as above. The
  compose file is still the reference for env-var values.
- **MinIO/S3 is not run locally.** Image upload endpoints won't store objects, but
  core flows (auth, tree registration, carbon, dashboard, passport PDF/QR) work
  without it. AI/satellite providers also fall back to stubs when keys are absent.
- **Backend `--reload` does not pick up new dependency installs**; restart uvicorn
  after changing installed packages.
