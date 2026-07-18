# BYOT — AI Service Layer

## 1. Goals

* Multi-vendor by design: in-house Vision Transformer (primary) with
  OpenAI / Gemini as fallback or "second opinion".
* All inferences are versioned and auditable.
* Backpressure-tolerant via Celery + Redis queues; OpenAI/Gemini calls are
  rate-limited per tenant.

## 2. Capabilities

| Capability | Primary model | Fallback | Inputs | Outputs |
|---|---|---|---|---|
| Species detection | `byot-vit-species-v3` (ViT-B/16 fine-tuned on 100+ species) | Gemini 2.0 Vision | 1–5 photos | `{species_id, confidence, topk[5]}` |
| Health classification | `byot-leaf-cnn-v2` (EfficientNet-B3) | GPT-4o Vision | leaf close-ups | `{class, confidence, diseases[]}` |
| Growth estimation | `byot-growth-gbm-v1` (LightGBM tabular) | — | species, age, climate, lat/lon, photo-derived height proxy | `{dbh_cm, height_m, canopy_m, biomass_kg}` |
| Carbon prediction | Allometric + species growth curve | — | growth output | 12-month / 10-year projection |
| AI assistant | GPT-4o (tool-use) | Gemini 2.0 Pro | NL prompt + user context | Answer + structured calculations |

## 3. Service interface

```python
class AIService(Protocol):
    async def detect_species(self, images: list[bytes]) -> SpeciesResult: ...
    async def classify_health(self, images: list[bytes]) -> HealthResult: ...
    async def estimate_growth(self, ctx: GrowthContext) -> GrowthResult: ...
    async def assistant_query(self, prompt: str, ctx: AssistantContext) -> AssistantAnswer: ...
```

The concrete implementation in `backend/app/services/ai/` is a
**composite** that:

1. Calls the in-house model via Triton (HTTP/gRPC).
2. If confidence < threshold, calls the LLM fallback.
3. Optionally requests a "second opinion" from the LLM and surfaces a
   *disagreement_score* in the analysis record.

## 4. Inference pipeline (Celery task)

```
ai.analyze(tree_id):
  images = S3.fetch(tree.images)
  pre    = preprocess(images)        # resize 512, strip EXIF, sRGB
  s      = SpeciesPipeline.run(pre)
  h      = HealthPipeline.run(pre)
  g      = GrowthPipeline.run(ctx(tree, s))
  recs   = RecEngine.run(tree, s, h, g)
  record = build_analysis_record(model_versions={...}, …)
  db.save(record); cache.invalidate(tree)
  events.emit("analysis.completed", record)
```

## 5. Prompts (LLM components)

### 5.1 Species fallback (vision)

```
SYSTEM: You are a botanist. Identify the tree species from the image(s).
Reply ONLY as JSON:
{"species_scientific": "<latin>", "species_common": "<english/local>",
 "confidence": 0..1, "alternates": [{...}], "rationale": "<≤40 words>"}
```

### 5.2 Health fallback

```
SYSTEM: You are an arborist. Classify health as one of
[healthy, moderate, unhealthy, disease_risk] and list visible diseases.
Be conservative — when in doubt, prefer 'moderate'.
```

### 5.3 Assistant (tool-use)

The assistant has access to these tools:

* `get_user_trees(filters)` → list
* `carbon_estimate(params)` → carbon engine call
* `growth_project(species, years)` → species growth curve
* `satellite_summary(tree_id)`

It must call the tools and return:

```json
{
  "answer": "...",
  "calculations": { ... },
  "citations": [ "..." ]
}
```

## 6. Evaluation

| Metric | Target |
|---|---|
| Species top-1 accuracy | ≥ 0.88 on internal eval set (10k images, 100 species) |
| Species top-5 accuracy | ≥ 0.97 |
| Health macro-F1 | ≥ 0.85 |
| Disease recall (critical) | ≥ 0.90 (we accept FP > FN) |
| Growth MAE (DBH) | ≤ 1.2 cm |
| Carbon MAPE | ≤ 15 % vs ground-truth allometric |

Eval datasets and notebooks live in a separate `byot-ml/` repo (not in this
monorepo). The serving contract here is stable.

## 7. Safety & governance

* PII / face blurring on uploaded photos before storage.
* Geo-fuzzing for public profile views (snap to 250 m grid).
* Model card stored for every deployed model (`/models/registry`).
* Human-in-the-loop overrides for any carbon claim that will be submitted to
  a registry (Verra/GS).
