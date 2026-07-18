# BYOT — Database Schema (PostgreSQL 16 + PostGIS 3.4)

> Authoritative ERD + DDL. The SQLAlchemy ORM in `backend/app/models/` is
> a 1:1 mirror of this document; Alembic migrations are derived from the ORM.

## 1. ER Diagram (textual)

```
organizations 1───* users
users         1───* trees                   (owner)
organizations 1───* trees                   (org-owned)
trees         1───* tree_images
trees         1───* tree_analysis           (one per AI run, history)
trees         1───* carbon_calculations     (history)
trees         1───* satellite_records       (history, per scene)
trees         1───* tree_metrics_ts         (time-series; TimescaleDB hypertable)
trees         1───* alerts
users         1───* alerts                  (recipient)
organizations 1───* reports
species       1───* trees
methodologies 1───* carbon_calculations
audit_logs    *   ── attached to any actor/resource
```

## 2. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Optional time-series:
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## 3. Enums

```sql
CREATE TYPE user_role        AS ENUM ('user','farmer','ngo','corporate','government','admin');
CREATE TYPE org_type         AS ENUM ('individual','farm','ngo','corporate','government');
CREATE TYPE tree_status      AS ENUM ('pending','active','dormant','dead','removed','suspect');
CREATE TYPE health_class     AS ENUM ('healthy','moderate','unhealthy','disease_risk','unknown');
CREATE TYPE alert_channel    AS ENUM ('push','email','sms','in_app');
CREATE TYPE alert_severity   AS ENUM ('info','warning','critical');
CREATE TYPE methodology_code AS ENUM ('IPCC_AR6','VERRA_VM0047','GOLD_STANDARD_LUF');
```

## 4. Core tables

### 4.1 organizations

```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  type            org_type NOT NULL DEFAULT 'individual',
  country_code    CHAR(2),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX organizations_type_idx ON organizations(type);
```

### 4.2 users

```sql
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email            CITEXT NOT NULL UNIQUE,
  phone            TEXT UNIQUE,
  full_name        TEXT NOT NULL,
  hashed_password  TEXT,                  -- nullable for pure OAuth users
  google_sub       TEXT UNIQUE,
  role             user_role NOT NULL DEFAULT 'user',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_org_idx ON users(organization_id);
```

### 4.3 species (master)

```sql
CREATE TABLE species (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scientific_name     TEXT NOT NULL UNIQUE,
  common_name         TEXT NOT NULL,
  family              TEXT,
  native_regions      TEXT[],
  -- Allometric params for AGB = a * DBH^b (kg dry biomass)
  agb_coef_a          NUMERIC(10,4),
  agb_coef_b          NUMERIC(6,3),
  wood_density        NUMERIC(6,3),  -- g/cm^3
  root_shoot_ratio    NUMERIC(5,3),  -- BGB = R * AGB
  carbon_fraction     NUMERIC(5,3) DEFAULT 0.47,
  max_height_m        NUMERIC(6,2),
  max_dbh_cm          NUMERIC(6,2),
  growth_curve        JSONB,         -- {age_years: dbh_cm}
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX species_common_trgm ON species USING gin (common_name gin_trgm_ops);
```

### 4.4 trees

```sql
CREATE TABLE trees (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_code        TEXT NOT NULL UNIQUE,  -- e.g. BYOT-7K3X-29A1
  organization_id    UUID REFERENCES organizations(id) ON DELETE SET NULL,
  owner_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  species_id         UUID REFERENCES species(id),
  species_text       TEXT,                  -- free-text fallback before AI
  status             tree_status NOT NULL DEFAULT 'pending',
  planted_at         DATE,
  registered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Geography
  location           GEOGRAPHY(Point, 4326) NOT NULL,
  altitude_m         NUMERIC(8,2),
  accuracy_m         NUMERIC(8,2),
  plantation_id      UUID,                  -- optional polygon grouping
  -- Cached metrics (most recent)
  current_height_m   NUMERIC(6,2),
  current_dbh_cm     NUMERIC(6,2),
  current_canopy_m   NUMERIC(6,2),
  current_health     health_class DEFAULT 'unknown',
  current_carbon_kg  NUMERIC(12,2) DEFAULT 0,
  satellite_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_satellite_at  TIMESTAMPTZ,
  last_analysis_at   TIMESTAMPTZ,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trees_location_gix ON trees USING GIST (location);
CREATE INDEX trees_owner_idx     ON trees (owner_user_id);
CREATE INDEX trees_org_idx       ON trees (organization_id);
CREATE INDEX trees_species_idx   ON trees (species_id);
CREATE INDEX trees_status_idx    ON trees (status);
CREATE INDEX trees_health_idx    ON trees (current_health);
```

### 4.5 tree_images

```sql
CREATE TABLE tree_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id       UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  s3_key        TEXT NOT NULL,
  cdn_url       TEXT,
  taken_at      TIMESTAMPTZ,
  taken_location GEOGRAPHY(Point, 4326),
  width_px      INT,
  height_px     INT,
  size_bytes    BIGINT,
  exif          JSONB,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tree_images_tree_idx ON tree_images(tree_id);
```

### 4.6 tree_analysis

```sql
CREATE TABLE tree_analysis (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id            UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  triggered_by       UUID REFERENCES users(id),
  model_pipeline     TEXT NOT NULL,      -- e.g. "vit-species-v3+leaf-cnn-v2+llm-gpt4o"
  model_versions     JSONB NOT NULL,
  -- Species
  species_id         UUID REFERENCES species(id),
  species_confidence NUMERIC(5,4),
  species_topk       JSONB,
  -- Health
  health             health_class,
  health_confidence  NUMERIC(5,4),
  diseases_detected  JSONB,              -- [{name, confidence, severity}]
  -- Growth
  estimated_height_m NUMERIC(6,2),
  estimated_dbh_cm   NUMERIC(6,2),
  estimated_canopy_m NUMERIC(6,2),
  estimated_biomass_kg NUMERIC(12,2),
  -- Recommendations
  recommendations    JSONB,              -- [{type, text, priority}]
  overall_confidence NUMERIC(5,4),
  raw_output         JSONB,              -- full model response, for audit
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tree_analysis_tree_idx ON tree_analysis(tree_id, created_at DESC);
```

### 4.7 carbon_calculations

```sql
CREATE TABLE carbon_calculations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id             UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  methodology         methodology_code NOT NULL DEFAULT 'IPCC_AR6',
  inputs              JSONB NOT NULL,    -- species, dbh, height, age, climate zone
  agb_kg              NUMERIC(12,2) NOT NULL,
  bgb_kg              NUMERIC(12,2) NOT NULL,
  total_biomass_kg    NUMERIC(12,2) NOT NULL,
  carbon_kg           NUMERIC(12,2) NOT NULL,
  co2e_kg             NUMERIC(12,2) NOT NULL,
  annual_sequestration_kg NUMERIC(12,2),
  lifetime_credits_tco2e NUMERIC(12,3),
  estimated_revenue_usd NUMERIC(12,2),
  price_assumption_usd NUMERIC(8,2),
  confidence          NUMERIC(5,4),
  engine_version      TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX carbon_tree_idx ON carbon_calculations(tree_id, created_at DESC);
```

### 4.8 satellite_records

```sql
CREATE TABLE satellite_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id             UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,     -- 'sentinel-2','landsat-8','landsat-9','planet'
  scene_id            TEXT NOT NULL,
  scene_acquired_at   TIMESTAMPTZ NOT NULL,
  cloud_cover_pct     NUMERIC(5,2),
  ndvi_mean           NUMERIC(6,4),
  ndvi_max            NUMERIC(6,4),
  ndvi_min            NUMERIC(6,4),
  evi_mean            NUMERIC(6,4),
  presence_confirmed  BOOLEAN,
  change_vs_baseline  NUMERIC(6,4),      -- delta NDVI
  thumbnail_s3_key    TEXT,
  raw_metadata        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sat_tree_time_idx ON satellite_records(tree_id, scene_acquired_at DESC);
```

### 4.9 tree_metrics_ts (TimescaleDB hypertable)

```sql
CREATE TABLE tree_metrics_ts (
  tree_id     UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  ts          TIMESTAMPTZ NOT NULL,
  ndvi        NUMERIC(6,4),
  height_m    NUMERIC(6,2),
  canopy_m    NUMERIC(6,2),
  biomass_kg  NUMERIC(12,2),
  carbon_kg   NUMERIC(12,2),
  health_score NUMERIC(5,2),
  source      TEXT,                       -- 'satellite','ai','manual'
  PRIMARY KEY (tree_id, ts)
);
-- SELECT create_hypertable('tree_metrics_ts','ts', chunk_time_interval => INTERVAL '30 days');
CREATE INDEX tree_metrics_ts_ts_idx ON tree_metrics_ts(ts DESC);
```

### 4.10 alerts

```sql
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tree_id         UUID REFERENCES trees(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,          -- health_decline,satellite_missing,etc.
  severity        alert_severity NOT NULL DEFAULT 'info',
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  channels        alert_channel[] NOT NULL DEFAULT ARRAY['in_app']::alert_channel[],
  delivered       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {push:true,email:false,...}
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alerts_user_idx ON alerts(user_id, created_at DESC);
```

### 4.11 reports

```sql
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by      UUID NOT NULL REFERENCES users(id),
  kind              TEXT NOT NULL,        -- tree,plantation,carbon,esg
  format            TEXT NOT NULL,        -- pdf,xlsx
  status            TEXT NOT NULL DEFAULT 'queued', -- queued,running,done,failed
  s3_key            TEXT,
  filters           JSONB NOT NULL DEFAULT '{}'::jsonb,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);
CREATE INDEX reports_org_idx ON reports(organization_id, created_at DESC);
```

### 4.12 audit_logs

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,            -- tree.create, tree.delete, login, ...
  resource_type TEXT,
  resource_id   UUID,
  ip            INET,
  user_agent    TEXT,
  diff          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_resource_idx ON audit_logs(resource_type, resource_id, created_at DESC);
```

## 5. Indexing & performance strategy

| Pattern | Index | Reason |
|---|---|---|
| Nearby trees | GIST on `trees.location` | Radius/bbox queries, vector tiles |
| Owner dashboards | btree `trees(owner_user_id)`, `trees(organization_id)` | tenant scoping |
| Time-series rollups | TS hypertable + retention policy | Monthly NDVI / biomass |
| Species typeahead | GIN trigram on `species.common_name` | UI search |
| Latest analysis | btree `tree_analysis(tree_id, created_at DESC)` | "current" lookups |

## 6. Partitioning roadmap

* `tree_metrics_ts` — TimescaleDB hypertable, 30-day chunks.
* `satellite_records` — declarative range partition by `scene_acquired_at` (monthly) once table > 500M rows.
* `audit_logs` — monthly partitions; archive > 12 months to S3 Parquet.

## 7. Row-level security (per-organization isolation)

```sql
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
CREATE POLICY trees_tenant_isolation
  ON trees USING (
    organization_id = current_setting('byot.current_org_id')::uuid
    OR owner_user_id   = current_setting('byot.current_user_id')::uuid
    OR current_setting('byot.current_role') = 'admin'
  );
```

The API sets `SET LOCAL byot.current_org_id` per request inside the
SQLAlchemy session checkout hook (see `core/database.py`).
