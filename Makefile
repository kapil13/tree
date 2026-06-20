.PHONY: help up down logs backend-shell frontend-shell migrate seed test lint

help:
	@echo "BYOT — common commands"
	@echo "  make up               Bring up local stack (postgres, redis, minio, backend, frontend)"
	@echo "  make down             Tear down"
	@echo "  make logs             Tail backend logs"
	@echo "  make migrate          Run Alembic migrations"
	@echo "  make seed             Seed demo data"
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

test:
	cd backend && pytest -q

lint:
	cd backend && ruff check .
	cd frontend && npm run typecheck
