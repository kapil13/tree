# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is

**BYOT — Bring Your Own Tree** is a ClimateTech monorepo:

| Path | Stack |
|---|---|
| `backend/` | FastAPI + PostGIS + Celery |
| `frontend/` | Next.js 15 dashboard |
| `mobile/` | Flutter field app |
| `infrastructure/` | Docker Compose, Terraform, Kubernetes |

### One-time Docker setup (Cursor Cloud VM)

Cursor Cloud VMs do not ship with Docker. Run once per fresh VM:

```bash
bash scripts/setup-docker.sh
```

This installs Docker CE, `fuse-overlayfs`, configures the daemon for nested containers, and starts `dockerd`.

If `dockerd` stops (VM restart), restart it:

```bash
sudo nohup dockerd --host=unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &
sudo chmod 666 /var/run/docker.sock
```

### Start the local stack

```bash
make up       # postgres, redis, minio, backend, frontend
make seed     # demo user + trees (after backend is healthy)
```

| Service | URL |
|---|---|
| Web dashboard | http://localhost:3000 |
| API / Swagger | http://localhost:8000/docs |
| MinIO console | http://localhost:9001 (`byotadmin` / `byotadmin123`) |

**Demo login** (after `make seed`): `demo@byot.earth` / `byotdemo1234!`

### Non-obvious gotchas

- **Docker 29+ on nested VMs** requires `fuse-overlayfs` storage driver and `"containerd-snapshotter": false` in `/etc/docker/daemon.json`. The setup script handles this.
- **MinIO bucket** is auto-created by the `minio-init` compose service (`byot-media`).
- **Frontend Docker build** requires `frontend/public/` to exist (even if empty).
- **AI / satellite keys** are optional in dev — services fall back to stubs when unset.
- **Mapbox token** is optional; set `NEXT_PUBLIC_MAPBOX_TOKEN` in `frontend/.env.local` for the map view.

### Quality gates

```bash
make backend-dev   # once: creates backend/.venv with pytest + ruff
make frontend-dev  # once: npm install in frontend/
make test          # backend pytest
make lint          # backend ruff + frontend typecheck
```
