.PHONY: help migrate-db import-india-admin deploy logs seed-demo

ENV_FILE := .env.production
COMPOSE_FILE := docker-compose.prod.yml
COMPOSE := docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE)
LGD_CSV ?= /opt/aranyix/data/lgd/villages_by_blocks.csv

help:
	@echo "Hostinger production ops (run from infrastructure/hostinger/)"
	@echo ""
	@echo "  make migrate-db          Run Alembic migrations in backend container"
	@echo "  make import-india-admin  Load LGD state/district/block/GP/village into DB"
	@echo "  make deploy              Run ./deploy.sh (build, migrate, health checks)"
	@echo "  make seed-demo           Seed demo user (optional)"
	@echo "  make logs                Tail backend logs"
	@echo ""
	@echo "India admin import needs the LGD CSV on the host (override with LGD_CSV=...):"
	@echo "  $(LGD_CSV)"

migrate-db:
	@test -f "$(ENV_FILE)" || (echo "Missing $(ENV_FILE) — copy from .env.production.example" && exit 1)
	$(COMPOSE) exec -T backend alembic upgrade head

import-india-admin:
	@test -f "$(ENV_FILE)" || (echo "Missing $(ENV_FILE) — copy from .env.production.example" && exit 1)
	@test -f "$(LGD_CSV)" || (echo "Missing LGD CSV at $(LGD_CSV)." && echo "Download villages_by_blocks from https://github.com/ramSeraph/opendata/releases and set LGD_CSV if needed." && exit 1)
	$(COMPOSE) run --rm -v "$(LGD_CSV):/tmp/lgd/import.csv:ro" backend \
		python -m app.scripts.import_india_admin --csv /tmp/lgd/import.csv

deploy:
	./deploy.sh

seed-demo:
	$(COMPOSE) exec -T backend python -m app.scripts.seed_demo

logs:
	$(COMPOSE) logs -f backend
