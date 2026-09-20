# Estate Watch audit kernel

An **Audit Engagement** is the long-lived relationship between Estate Watch and a planting project. An **Audit Cycle** is one bounded audit period within that engagement. Existing engagement status remains available for backward compatibility; new audit integrity work must use the cycle as its period boundary.

Cycles progress through the defined lifecycle and become immutable at `attested`. Evidence, deterministic results, sampling plans, field verification, attestation, and export material belonging to an attested period must never be overwritten. A correction is represented by **Start Re-audit**, which preserves the prior cycle, marks it `superseded`, and opens a new cycle linked through `parent_cycle_id`.

An **Audit Run** records a deterministic computation's provenance: inputs, parameters, methodology/application/algorithm versions, and output manifests. Runs are append-only; a running run may become `completed` or `failed`, but completed results are not silently replaced.

Future Estate Watch work should add `cycle_id` to new period-scoped evidence or result tables and `audit_run_id` where a deterministic computation produced the result. Existing engagement-scoped tables are deliberately not rewritten by this foundation migration.

## P1 finality (migration `0081`)

- `audit_policy_evaluations` — server-side attestation readiness checks (no client bypass flags).
- `audit_verification_snapshots` — immutable public verification payloads per attested cycle.
- Attestation signatures and reviewer attestations are scoped by `cycle_id` (one attestation record per cycle).
- `require_mutable_cycle()` guards all Estate Watch mutation services; attested cycles cannot be modified.
- Default `required_signatures = 1` (Aranyix operator); multi-sign remains configurable via engagement metadata.

## Wave A scope (migration `0082`)

- `cycle_id` on satellite, confidence, risk, sampling, and field-visit evidence tables — re-audit periods no longer share mutable rows.
- `audit_runs` wired into confidence map, risk scan, and export bundle generation (append-only provenance).
- Methodology registry (`audit_methodologies`, `audit_rule_versions`, `audit_threshold_sets`) with default `estate-watch-1.0.0`.
- Persisted export entities (`audit_exports`, `audit_export_files`) with distinct `content_manifest_hash`, `unsigned_bundle_hash`, and `package_sha256`.
- `POST /audit-engagements/{id}/exports` creates a cycle-scoped export record; `GET /export` still downloads the zip bundle.
- Cycle-scoped export context, readiness, and reconciliation reads default to the open cycle (or latest when attested).

## Wave B ground truth (migration `0083`)

- **P2** — Versioned sampling plans (`plan_version`, `parent_plan_id`, `superseded_at`); regenerate supersedes the active plan instead of deleting plots/visits.
- **P3** — Field visit lifecycle (`status`, `idempotency_key`, GPS/photo integrity flags); hard-fail on outside-boundary GPS or duplicate photos.
- **P6** — Persisted reconciliation (`audit_reconciliation_runs`, `audit_reconciliation_blocks`) with `audit_run` provenance; auto-computed on field verification complete.
- **P10** — Evidence graph (`audit_evidence_nodes`, `audit_evidence_edges`) linking claims → estimations → observations → attestations.
- **API** — `POST /reconciliation/compute`, `GET /evidence-graph`; visit `idempotency_key` on field visit create.

## Wave C portfolio ops (migration `0084`)

- **P5** — Persisted per-cycle portfolio rollups (`audit_portfolio_cycle_rollups`) with grade/risk/anomaly/plot/reconciliation aggregates; `POST /portfolio-rollups/compute`, `GET /portfolio-rollups`.
- **P7–P9** — Benchmark baselines (`audit_benchmark_baselines`) and cross-estate anomaly patterns (`audit_cross_estate_patterns`); `POST /benchmarks/compute`, `GET /benchmarks`, `POST /cross-estate-patterns/detect`, `GET /cross-estate-patterns`.
- **P13** — Auditor workspace multi-estate queue with saved filter presets (`audit_auditor_workspace_views`); `GET /auditor-workspace`, `POST/GET /auditor-workspace/views`.
- **P15–P16** — Report templates (`audit_report_templates`), digest schedules/runs (`audit_digest_schedules`, `audit_digest_runs`); `GET /report-templates`, `POST/GET /digest-schedules`, `POST /digest-schedules/{id}/run`, `GET /digest-runs`.
- Portfolio summary and field plot queue now scope plots to **active sampling plans** only (Wave B).

## Wave D export & methodology depth (migration `0085`)

- **P11** — Frozen export artifacts (`audit_export_artifacts`), persisted `signature_json` / `frozen_at` on `audit_exports`; `GET /exports`, `GET /exports/{id}`, `GET /exports/{id}/download`.
- **P12** — Export signature verification records (`audit_export_verifications`); `POST /exports/{id}/verify`.
- **P17–P21** — Seeded rule versions and threshold sets; runtime resolver; engagement methodology bindings (`audit_engagement_methodology_overrides`) and change log (`audit_methodology_change_log`); `GET /methodologies`, `GET /methodologies/{version}`, `GET/PUT /{id}/methodology`, `GET /{id}/methodology/change-log`.
- **P18** — Risk scan reads `ndvi_acute_drop` thresholds from the methodology registry (with engagement overrides).
- **P22** — Expanded audit RBAC (`can_read/write/verify_audit_engagement`) for org viewer/verifier roles.
- **P23** — Attestation verification snapshots bind `export_id` to frozen export records.
- **P24** — Public verify resolves digests via `audit_exports.package_sha256` / `unsigned_bundle_hash`.
- `GET /export/summary` reads the latest `audit_exports` row instead of engagement metadata only.

## Wave E explain-only AI (migration `0086`)

- **P14** — Grounded explain-only narratives for auditors (`audit_explain_runs`); never mutates grades, anomalies, or attestation.
- Rules fallback always available; optional OpenAI/Gemini enrichment when API keys are set (`mode`: `rules` | `llm`).
- **API** — `POST /anomalies/{id}/explain`, `POST /reconciliation/explain`, `POST /evidence-graph/explain`, `POST /cross-estate-patterns/{id}/explain`, `GET /explain-runs`.
- Explain context includes methodology thresholds (P18) and deterministic signals only — LLM cannot override audit outcomes.

## Wave F UI parity (frontend)

- **P0 reconciliation** — `audit-reconciliation-panel.tsx`: compute persisted run, per-block and summary explain.
- **P0 export history** — `audit-export-panel.tsx`: list exports, frozen download, signature verify.
- **P1 evidence graph** — `audit-evidence-graph-panel.tsx` under reconciliation phase.
- **P1 explain** — `audit-explain-result.tsx` + explain buttons on risk anomalies and portfolio patterns.
- **P2 portfolio ops** — `audit-portfolio-ops-section.tsx` on `/portfolio-health?tab=audit`: rollups, benchmarks, patterns, workspace, digests.
- **P3 methodology** — `audit-methodology-panel.tsx` on project audit workspace.
- API client: `auditEngagements` methods in `frontend/lib/api.ts` for Waves C–E endpoints.
