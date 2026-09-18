# Estate Watch audit kernel

An **Audit Engagement** is the long-lived relationship between Estate Watch and a planting project. An **Audit Cycle** is one bounded audit period within that engagement. Existing engagement status remains available for backward compatibility; new audit integrity work must use the cycle as its period boundary.

Cycles progress through the defined lifecycle and become immutable at `attested`. Evidence, deterministic results, sampling plans, field verification, attestation, and export material belonging to an attested period must never be overwritten. A correction is represented by **Start Re-audit**, which preserves the prior cycle, marks it `superseded`, and opens a new cycle linked through `parent_cycle_id`.

An **Audit Run** records a deterministic computation's provenance: inputs, parameters, methodology/application/algorithm versions, and output manifests. Runs are append-only; a running run may become `completed` or `failed`, but completed results are not silently replaced.

Future Estate Watch work should add `cycle_id` to new period-scoped evidence or result tables and `audit_run_id` where a deterministic computation produced the result. Existing engagement-scoped tables are deliberately not rewritten by this foundation migration.
