FROM python:3.12-slim AS base

# API image: INSTALL_BIOACOUSTIC=0 (default) — slim, fits 1.5GB RAM limit.
# Worker image: INSTALL_BIOACOUSTIC=1 — BirdNET / TensorFlow for Celery tasks.
ARG INSTALL_BIOACOUSTIC=0

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev libgeos-dev libproj-dev curl ca-certificates \
        ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements-bioacoustic.txt ./
RUN pip install -r requirements.txt \
    && if [ "$INSTALL_BIOACOUSTIC" = "1" ]; then pip install -r requirements-bioacoustic.txt; fi

COPY . .

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://localhost:8000/health/live || exit 1

ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
