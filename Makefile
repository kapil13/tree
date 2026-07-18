.PHONY: help dev-start dev-stop dev-status setup-native migrate-native seed-native test lint
.PHONY: up down logs migrate seed docker-legacy

help:
	@echo "BYOT — Native Mac (no Docker)"
	@echo "  make setup-native     One-time install (Postgres.app + Redis + deps)"
	@echo "  make dev-start        Start backend + frontend in background"
	@echo "  make dev-stop         Stop backend + frontend"
	@echo "  make dev-status       Health check + logs"
	@echo "  make migrate-native   Run Alembic migrations"
	@echo "  make seed-native      Seed demo user"
	@echo "  make test             Run backend tests"
	@echo "  make lint             Lint backend and frontend"
	@echo "  make mobile-apk       Build Android release APK (requires Flutter)"
	@echo ""
	@echo "Production (Hostinger KVM 4): see docs/DEPLOYMENT_HOSTINGER.md"
	@echo "  cd infrastructure/hostinger && cp .env.production.example .env.production && ./deploy.sh"
	@echo ""
	@echo "Docker (optional, not needed for Mac dev): make docker-legacy"

setup-native:
	./scripts/setup-mac-native.sh

dev-start:
	./scripts/dev-start.sh

dev-stop:
	./scripts/dev-stop.sh

dev-status:
	./scripts/dev-status.sh

migrate-native:
	cd backend && . .venv/bin/activate && alembic upgrade head

seed-native:
	cd backend && . .venv/bin/activate && python -m app.scripts.seed_demo

test:
	cd backend && . .venv/bin/activate && pytest -q

lint:
	cd backend && . .venv/bin/activate && python -m ruff check . 2>/dev/null || true
	cd frontend && npm run typecheck

mobile-apk:
	./scripts/build-android-apk.sh

# Legacy Docker targets (optional — ignore for native Mac dev)
docker-legacy:
	@echo "Docker is optional. For native Mac use: make dev-start"
	@echo "See docs/LOCAL_MAC_NATIVE.md"

up down logs migrate seed fix fix-frontend docker-prune: docker-legacy
