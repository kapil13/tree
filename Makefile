.PHONY: help up down logs backend-shell frontend-shell migrate seed test lint status fix

help:
	@echo "BYOT — common commands"
	@echo "  make up               Bring up local stack (postgres, redis, minio, backend, frontend)"
	@echo "  make down             Tear down"
	@echo "  make status           Show container status + API health"
	@echo "  make fix              Rebuild and restart backend only"
	@echo "  make logs             Tail backend logs"
	@echo "  make migrate          Run Alembic migrations"
	@echo "  make seed             Seed demo data"
	@echo "  make test             Run backend tests"
	@echo "  make lint             Lint backend and frontend"

up:
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
