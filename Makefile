.PHONY: help up down logs backend-shell frontend-shell migrate seed test lint status fix fix-frontend fix-frontend-clean docker-prune

help:
	@echo "BYOT — common commands"
	@echo "  make up                    Bring up local stack"
	@echo "  make down                  Tear down"
	@echo "  make status                Show container status + API health"
	@echo "  make fix                   Rebuild and restart backend only"
	@echo "  make fix-frontend          Rebuild frontend (uses cache — lighter on disk)"
	@echo "  make fix-frontend-clean    Rebuild frontend with --no-cache"
	@echo "  make docker-prune          Free Docker disk space (run if I/O errors)"
	@echo "  make logs                  Tail backend logs"
	@echo "  make migrate               Run Alembic migrations"
	@echo "  make seed                  Seed demo data"
	@echo "  make test                  Run backend tests"
	@echo "  make lint                  Lint backend and frontend"

up:
	@set -a && [ -f frontend/.env.local ] && . ./frontend/.env.local; set +a; \
	docker compose -f infrastructure/docker-compose.yml up --build -d

down:
	docker compose -f infrastructure/docker-compose.yml down

status:
	@docker compose -f infrastructure/docker-compose.yml ps -a
	@echo ""
	@echo "Backend health:"
	@curl -sf http://localhost:8000/health && echo "" || echo "  FAILED — backend not reachable on :8000"
	@echo "Frontend:"
	@curl -sf -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3000 || echo "  FAILED — frontend not reachable on :3000"

fix:
	docker compose -f infrastructure/docker-compose.yml build --no-cache backend
	docker compose -f infrastructure/docker-compose.yml up -d --force-recreate backend
	@echo "Waiting for backend..."
	@sleep 10
	docker compose -f infrastructure/docker-compose.yml ps backend
	docker compose -f infrastructure/docker-compose.yml logs backend --tail 40
	@curl -sf http://localhost:8000/health && echo "" || echo "Backend still down — run: make logs"

fix-frontend:
	@set -a && [ -f frontend/.env.local ] && . ./frontend/.env.local; set +a; \
	docker compose -f infrastructure/docker-compose.yml build frontend && \
	docker compose -f infrastructure/docker-compose.yml up -d --force-recreate frontend && \
	echo "Frontend rebuilt — API: http://localhost:8000/api" && \
	if [ -z "$$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" ]; then \
	  echo "Note: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set — maps will be disabled"; \
	else \
	  echo "Google Maps key was included in the build"; \
	fi

fix-frontend-clean:
	@set -a && [ -f frontend/.env.local ] && . ./frontend/.env.local; set +a; \
	docker compose -f infrastructure/docker-compose.yml build --no-cache frontend && \
	docker compose -f infrastructure/docker-compose.yml up -d --force-recreate frontend && \
	echo "Frontend rebuilt (clean) — API: http://localhost:8000/api"

docker-prune:
	@echo "Freeing Docker build cache and unused images (safe for BYOT — will re-download on next build)..."
	docker builder prune -af
	docker image prune -af
	@echo "Done. If errors persist: restart Docker Desktop → Troubleshoot → Clean data"

logs:
	docker compose -f infrastructure/docker-compose.yml logs -f backend

backend-shell:
	docker compose -f infrastructure/docker-compose.yml exec backend bash

frontend-shell:
	docker compose -f infrastructure/docker-compose.yml exec frontend sh

migrate:
	docker compose -f infrastructure/docker-compose.yml exec backend alembic upgrade head

seed:
	docker compose -f infrastructure/docker-compose.yml exec backend python -m app.scripts.seed_demo

test:
	cd backend && pytest -q

lint:
	cd backend && ruff check .
	cd frontend && npm run typecheck
