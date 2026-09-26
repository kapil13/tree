# Target architecture (not fully implemented)

Use this document for **roadmap and design intent**. Do not cite it as shipped functionality — see `IMPLEMENTED.md` instead.

## Internationalization

| Target | Current |
|--------|---------|
| 8 Indian languages on web (ta, te, mr, gu, kn, ml + en, hi) | **en + hi only** |
| Locale-prefixed public URLs (`/hi/solutions/...`) | Cookie / `Accept-Language` only |
| Full mobile parity for all CMS strings | Partial — core UI translated |

## Data platform

| Target | Current |
|--------|---------|
| Universal PostgreSQL RLS on all tenant tables | RLS on selected tables (`0087`) |
| TimescaleDB hypertables for all time-series | Planned in `DATABASE_SCHEMA.md` §6 |
| Full STAC catalog in object storage | API stubs + project items from DB |

## API productization

| Target | Current |
|--------|---------|
| Global `Idempotency-Key` on all mutating routes | Tree create, payment orders, audit export create |
| `/api/v2` with Sunset headers on v1 deprecations | v1 only; Sunset middleware on legacy register |
| Public OGC API Features landing page | Authenticated JSON endpoints only |

## Compliance & registry

| Target | Current |
|--------|---------|
| Third-party registry issuance | Worksheet exports + internal credit ledger |
| Automated SBTi / Verra validation | Mapped evidence packs with disclaimers |
