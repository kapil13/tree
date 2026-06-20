# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

This repository (`kapil13/tree`) is a placeholder. The actual application under
development is **BYOT — "Bring Your Own Tests"** (`github.com/alexanderritik/BYOT`),
a Go HTTP service that stores uploaded test binaries in MinIO and executes them on
demand inside ephemeral Docker containers, recording runs in PostgreSQL.

The update script clones BYOT into `./byot` (gitignored) and refreshes its Go
dependencies. All commands below run from `./byot`. See `byot/README.md` for the
canonical API/quick-start docs.

### Services

| Service | Purpose | Start command | Port |
|---|---|---|---|
| PostgreSQL | tests / tests_runs metadata | `docker compose up -d postgres minio` | 5432 |
| MinIO | binary + log object storage | (same compose command) | 9000 (API) / 9001 (console) |
| Go API server | upload/run/health endpoints | `set -a; source .env; set +a; go run .` | 3000 |

The compose file also defines a `portainer` service that is **not needed**; only
bring up `postgres` and `minio`.

### One-off environment setup (NOT in the update script)

These are system-level / stateful steps. The update script intentionally does not
do them (no system deps, no service startup). Do them once per fresh VM:

1. **Install Docker (docker-in-docker).** Docker is required both for the infra
   containers AND because the `/run` endpoint shells out to `docker run` to execute
   test binaries. Install Docker CE + compose plugin, then write
   `/etc/docker/daemon.json` with `"storage-driver": "fuse-overlayfs"` and
   `"features": {"containerd-snapshotter": false}` (the snapshotter MUST be disabled
   on Docker 29+ for fuse-overlayfs to work), set iptables to `iptables-legacy`, and
   start `dockerd` (no systemd; run `sudo dockerd` in the background, e.g. a tmux
   session). Give the `ubuntu` user socket access: `sudo usermod -aG docker ubuntu`
   and `sudo chmod 666 /var/run/docker.sock` (the Go server invokes `docker` without
   sudo).
2. **Create the MinIO bucket.** The app does **NOT** auto-create its bucket, so
   `/uploadBinary` fails until it exists. Create it once:
   `docker run --rm --network host --entrypoint sh minio/mc -c "mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb --ignore-existing local/byot"`

### Non-obvious gotchas

- **Go toolchain:** `byot/go.mod` pins `go 1.26.1`, but the base image ships Go 1.22.
  `GOTOOLCHAIN=auto` (the default) auto-downloads `go1.26.1` on first build/run — no
  manual Go upgrade needed, just network access.
- **Env file:** `byot/.env` uses `export VAR=...` lines, so load it with
  `set -a; source .env; set +a` (or just `source .env`) before `go run .`.
  Migrations run automatically on startup against `DB_URL`.
- **`index.html` is a static marketing landing page** and is NOT served by the Go
  server. The service is API-only (`/health`, `/uploadBinary`, `/run/{id}`).
- **Runtimes:** uploaded binaries must match the runtime image — `runtime=go` runs
  the binary directly in `alpine` (use a static linux/amd64 binary), `runtime=node`
  runs it with `node:18`. `byot/testfunc/myfunction` is a ready-made static Go binary
  useful for smoke tests.
- **`/run` request body** is `{"testId":"<uuid>"}`; the uuid is the prefix of the
  `id` returned by `/uploadBinary` (strip the trailing `/binary`).

### Quality gates

From `./byot`: `go vet ./...` and `go test ./...` (no test files currently, so the
latter is a no-op but confirms compilation). Hot reload during development:
`air` (config in `byot/.air.toml`; install with `go install github.com/air-verse/air@latest`).
