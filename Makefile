.PHONY: help up down logs backend-shell frontend-shell migrate seed test lint backend-dev frontend-dev

BACKEND_DIR = backend
BACKEND_VENV = $(BACKEND_DIR)/.venv
BACKEND_BIN = $(BACKEND_VENV)/bin

help:
	@echo "BYOT — common commands"
	@echo "  make up               Bring up local stack (postgres, redis, minio, backend, frontend)"
	@echo "  make down             Tear down"
	@echo "  make logs             Tail backend logs"
	@echo "  make migrate          Run Alembic migrations"
	@echo "  make seed             Seed demo data"
	@echo "  make backend-dev      Create backend venv + install pytest/ruff (for make test/lint)"
	@echo "  make frontend-dev     Install frontend npm dependencies"
	@echo "  make test             Run backend tests"
	@echo "  make lint             Lint backend and frontend"

up:
	docker compose -f infrastructure/docker-compose.yml up --build -d

down:
	docker compose -f infrastructure/docker-compose.yml down

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

backend-dev:
	cd $(BACKEND_DIR) && python3 -m venv .venv
	$(BACKEND_BIN)/pip install -q -r $(BACKEND_DIR)/requirements-dev.txt
	@echo "Backend dev environment ready ($(BACKEND_VENV))."

frontend-dev:
	cd frontend && npm install --no-fund --no-audit --legacy-peer-deps
	@echo "Frontend dependencies installed."

test: backend-dev
	cd $(BACKEND_DIR) && .venv/bin/python -m pytest -q

lint: backend-dev frontend-dev
	cd $(BACKEND_DIR) && .venv/bin/python -m ruff check .
	cd frontend && npm run typecheck
