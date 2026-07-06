# BYOT on Mac — no Docker

Run everything natively: **Postgres.app** (PostGIS) + **Homebrew Redis** + **Python 3.12** + **Node 20**.

Docker, Terraform, and Kubernetes in `infrastructure/` are **optional** for cloud deployment — ignore them for local dev.

---

## One-time setup

### 1. Install tools

```bash
brew install python@3.12 node@20 redis
```

Add to `~/.zshrc`:

```bash
export PATH="/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/node@20/bin:$PATH"
```

### 2. Postgres.app (PostGIS included)

1. Download https://postgresapp.com/ and open it
2. Click **Initialize** (server on port **5432**)
3. Postgres.app menu → **Settings** → add `bin` to your PATH (copy into `~/.zshrc`)
4. `source ~/.zshrc`

```bash
createdb byot
psql byot -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql byot -c "SELECT PostGIS_Version();"
```

### 3. Redis

```bash
brew services start redis
redis-cli ping   # PONG
```

### 4. Backend

```bash
cd /Users/Ayushi/tree
cp backend/.env.native.example backend/.env
```

Edit `backend/.env` — use your Mac username (`whoami`), port **5432**:

```env
DATABASE_URL=postgresql+asyncpg://YOUR_USER@localhost:5432/byot
DATABASE_URL_SYNC=postgresql+psycopg2://YOUR_USER@localhost:5432/byot
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=dev-secret
S3_ENDPOINT_URL=
```

If your Postgres password contains `@`, URL-encode it (`@` → `%40`).

```bash
./scripts/setup-mac-native.sh
```

### 5. Frontend

```bash
cd frontend
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-key
```

```bash
npm install
```

---

## Daily commands

```bash
cd /Users/Ayushi/tree

# Postgres.app must be open; Redis running:
brew services start redis

./scripts/dev-start.sh
./scripts/dev-status.sh
./scripts/dev-stop.sh
```

Or:

```bash
make dev-start
make dev-status
make dev-stop
```

**Login:** http://localhost:3000/login → `demo@byot.earth` / `byotdemo1234!`

---

## What runs where

| Service | How | Port |
|---------|-----|------|
| Postgres + PostGIS | Postgres.app (keep app open) | 5432 |
| Redis | `brew services start redis` | 6379 |
| Backend API | `./scripts/dev-start.sh` | 8000 |
| Frontend | `./scripts/dev-start.sh` | 3000 |

---

## Logs

```bash
tail -f .dev/backend.log
tail -f .dev/frontend.log
```
