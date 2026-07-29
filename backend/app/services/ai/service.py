"""AI service layer.

In production this orchestrates Triton (in-house ViT + leaf CNN),
LightGBM growth model, and OpenAI/Gemini LLMs. For development and tests
we provide a deterministic, dependency-free stub implementation that
produces realistic-looking outputs so the rest of the platform is fully
exercisable without external accounts.

Switch behaviour via env vars (OPENAI_API_KEY / GEMINI_API_KEY). When
neither is set, the StubAIService is used.
"""

from __future__ import annotations

import hashlib
import random
from typing import Protocol

from app.core.config import settings
from app.services.ai.llm_vision import analyze_tree_vision
from app.services.ai.types import (
    AnalysisResult,
    DiseaseFinding,
    GrowthContext,
    GrowthResult,
    HealthResult,
    Recommendation,
    SpeciesPrediction,
    SpeciesResult,
)
from app.services.carbon.species_catalog import SPECIES_CATALOG, by_name


class AIService(Protocol):
    async def detect_species(
        self, images: list[bytes], hint: str | None = None
    ) -> SpeciesResult: ...

    async def classify_health(self, images: list[bytes]) -> HealthResult: ...

    async def estimate_growth(self, ctx: GrowthContext) -> GrowthResult: ...

    async def full_analysis(
        self,
        images: list[bytes],
        species_hint: str | None,
        ctx: GrowthContext,
    ) -> AnalysisResult: ...

    async def assistant(self, prompt: str, ctx: dict) -> dict: ...


# ---------------------------------------------------------------------------
# Stub implementation (development/test default)
# ---------------------------------------------------------------------------


class StubAIService:
    name = "byot-ai-stub-1.0.0"

    def _rng(self, seed_source: str) -> random.Random:
        h = hashlib.sha256(seed_source.encode("utf-8")).digest()
        return random.Random(int.from_bytes(h[:8], "big"))

    async def detect_species(
        self, images: list[bytes], hint: str | None = None
    ) -> SpeciesResult:
        seed = (hint or "") + str(len(images)) + (images[0][:32].hex() if images else "")
        rng = self._rng(seed or "seed")

        if hint:
            sp = by_name(hint)
            if sp is not None:
                top = SpeciesPrediction(sp.scientific_name, sp.common_name, 0.91)
                others = rng.sample(
                    [s for s in SPECIES_CATALOG if s.scientific_name != sp.scientific_name],
                    k=min(4, len(SPECIES_CATALOG) - 1),
                )
                topk = [top] + [
                    SpeciesPrediction(s.scientific_name, s.common_name, round(0.5 - i * 0.08, 2))
                    for i, s in enumerate(others)
                ]
                return SpeciesResult(top=top, topk=topk, model=self.name)

        chosen = rng.choice(SPECIES_CATALOG)
        confidence = round(rng.uniform(0.62, 0.93), 2)
        top = SpeciesPrediction(chosen.scientific_name, chosen.common_name, confidence)
        rest = rng.sample(
            [s for s in SPECIES_CATALOG if s.scientific_name != chosen.scientific_name],
            k=min(4, len(SPECIES_CATALOG) - 1),
        )
        topk = [top] + [
            SpeciesPrediction(s.scientific_name, s.common_name, round(confidence - 0.10 - i * 0.07, 2))
            for i, s in enumerate(rest)
        ]
        return SpeciesResult(top=top, topk=topk, model=self.name)

    async def classify_health(self, images: list[bytes]) -> HealthResult:
        seed = "health" + (images[0][:32].hex() if images else "x")
        rng = self._rng(seed)
        cls = rng.choices(
            ["healthy", "moderate", "unhealthy", "disease_risk"],
            weights=[0.55, 0.25, 0.10, 0.10],
            k=1,
        )[0]
        diseases: list[DiseaseFinding] = []
        if cls in ("unhealthy", "disease_risk"):
            name = rng.choice(["leaf_spot", "powdery_mildew", "anthracnose", "rust", "blight"])
            diseases.append(
                DiseaseFinding(
                    name=name,
                    confidence=round(rng.uniform(0.55, 0.88), 2),
                    severity=rng.choice(["low", "moderate", "high"]),
                )
            )
        return HealthResult(
            health_class=cls,
            confidence=round(rng.uniform(0.7, 0.92), 2),
            diseases=diseases,
            model=self.name,
        )

    async def estimate_growth(self, ctx: GrowthContext) -> GrowthResult:
        sp = by_name(ctx.species_scientific) if ctx.species_scientific else None
        seed = f"grow:{ctx.species_scientific}:{ctx.age_years}:{ctx.photo_count}"
        rng = self._rng(seed)
        age = ctx.age_years if ctx.age_years is not None else rng.uniform(2, 8)
        if sp and sp.growth_curve:
            from app.services.carbon.engine import _interp_growth

            dbh = _interp_growth(sp.growth_curve, age)
        else:
            dbh = max(1.0, 1.8 * age)
        height = 1.3 + (sp.max_height_m if sp else 22.0) * (
            1.0 - pow(2.718281828, -0.05 * dbh)
        )
        canopy = max(0.5, 0.45 * height)
        # rough biomass (delegate exact value to carbon engine downstream)
        a, b = (float(sp.agb_coef_a), float(sp.agb_coef_b)) if sp else (0.073, 2.42)
        biomass = a * (dbh ** b)
        return GrowthResult(
            dbh_cm=round(dbh, 2),
            height_m=round(height, 2),
            canopy_m=round(canopy, 2),
            biomass_kg=round(biomass, 2),
            confidence=0.78 if sp else 0.55,
            model=self.name,
        )

    async def full_analysis(
        self,
        images: list[bytes],
        species_hint: str | None,
        ctx: GrowthContext,
    ) -> AnalysisResult:
        species = await self.detect_species(images, species_hint)
        ctx2 = GrowthContext(
            species_scientific=species.top.scientific_name,
            age_years=ctx.age_years,
            climate_zone=ctx.climate_zone,
            lat=ctx.lat,
            lon=ctx.lon,
            photo_count=ctx.photo_count or len(images),
        )
        health = await self.classify_health(images)
        growth = await self.estimate_growth(ctx2)
        recs = _build_recommendations(health, growth)
        overall = round(
            0.4 * species.top.confidence + 0.35 * health.confidence + 0.25 * growth.confidence, 3
        )
        return AnalysisResult(
            species=species,
            health=health,
            growth=growth,
            recommendations=recs,
            overall_confidence=overall,
            pipeline=self.name,
            versions={
                "species": self.name,
                "health": self.name,
                "growth": self.name,
            },
        )

    async def assistant(self, prompt: str, ctx: dict) -> dict:
        # Stub: deterministic templated answer
        rng = self._rng(prompt)
        years = ctx.get("years", 10)
        trees = ctx.get("tree_count", 1)
        species = ctx.get("species") or "Neem"
        per_tree = round(rng.uniform(20, 40), 1)
        total_t = round(per_tree * trees * years / 1000.0, 2)
        return {
            "answer": (
                f"Based on a {species} plantation of {trees} trees and IPCC AR6 + species "
                f"allometric defaults, the estimated sequestration is approximately "
                f"{total_t} tCO2e over {years} years (~{per_tree} kg/tree/year). "
                "Actual results depend on rainfall, soil, and management."
            ),
            "calculations": {
                "annual_per_tree_kg_co2e": per_tree,
                "tree_count": trees,
                "years": years,
                "total_tco2e": total_t,
            },
            "citations": [
                "IPCC AR6 Vol 4 Ch 4",
                "Chave et al. 2014",
                "Verra VM0047",
            ],
        }


def _build_recommendations(
    health: HealthResult, growth: GrowthResult
) -> list[Recommendation]:
    recs: list[Recommendation] = []
    if health.health_class == "unhealthy":
        recs.append(
            Recommendation(
                "general",
                "Tree shows poor vigor. Consult a local arborist and consider replanting if no recovery in 30 days.",
                "critical",
            )
        )
    if health.health_class == "moderate":
        recs.append(
            Recommendation(
                "nutrient",
                "Apply balanced NPK 19-19-19 at 100 g per cm DBH; mulch base 5 cm.",
                "warning",
            )
        )
    if health.diseases:
        d = health.diseases[0]
        recs.append(
            Recommendation(
                "pest",
                f"Possible {d.name.replace('_', ' ')} ({d.severity}). Spray neem oil 1% bi-weekly.",
                "warning",
            )
        )
    if growth.dbh_cm < 3:
        recs.append(
            Recommendation(
                "water",
                "Young tree: irrigate 10 L every 3 days in dry season.",
                "info",
            )
        )
    if not recs:
        recs.append(
            Recommendation(
                "general", "Tree looks healthy. Continue routine monthly inspection.", "info"
            )
        )
        return recs


# ---------------------------------------------------------------------------
# LLM-enhanced composite (vision when API keys are configured)
# ---------------------------------------------------------------------------


class LLMEnhancedAIService:
    """Uses OpenAI/Gemini vision for species & health; growth stays allometric."""

    def __init__(self, *, stub: StubAIService | None = None) -> None:
        self._stub = stub or StubAIService()

    @property
    def name(self) -> str:
        if settings.openai_api_key:
            return "openai/gpt-4o-mini-vision"
        if settings.gemini_api_key:
            return "gemini/gemini-1.5-flash-vision"
        return self._stub.name

    async def detect_species(
        self, images: list[bytes], hint: str | None = None
    ) -> SpeciesResult:
        llm = await analyze_tree_vision(images, species_hint=hint)
        if llm is not None:
            return llm[0]
        return await self._stub.detect_species(images, hint)

    async def classify_health(self, images: list[bytes]) -> HealthResult:
        llm = await analyze_tree_vision(images)
        if llm is not None:
            return llm[1]
        return await self._stub.classify_health(images)

    async def estimate_growth(self, ctx: GrowthContext) -> GrowthResult:
        return await self._stub.estimate_growth(ctx)

    async def full_analysis(
        self,
        images: list[bytes],
        species_hint: str | None,
        ctx: GrowthContext,
    ) -> AnalysisResult:
        llm = await analyze_tree_vision(images, species_hint=species_hint)
        if llm is not None:
            species, health, llm_recs, pipeline = llm
            ctx2 = GrowthContext(
                species_scientific=species.top.scientific_name,
                age_years=ctx.age_years,
                climate_zone=ctx.climate_zone,
                lat=ctx.lat,
                lon=ctx.lon,
                photo_count=ctx.photo_count or len(images),
            )
            growth = await self._stub.estimate_growth(ctx2)
            recs = llm_recs or _build_recommendations(health, growth)
            overall = round(
                0.4 * species.top.confidence
                + 0.35 * health.confidence
                + 0.25 * growth.confidence,
                3,
            )
            return AnalysisResult(
                species=species,
                health=health,
                growth=growth,
                recommendations=recs,
                overall_confidence=overall,
                pipeline=pipeline,
                versions={
                    "species": pipeline,
                    "health": pipeline,
                    "growth": self._stub.name,
                },
            )

        return await self._stub.full_analysis(images, species_hint, ctx)

    async def assistant(self, prompt: str, ctx: dict) -> dict:
        return await self._stub.assistant(prompt, ctx)


def ai_service_status() -> dict[str, str | bool | None]:
    """Integration health metadata — keep in sync with intelligence.integrations."""
    if settings.openai_api_key:
        return {
            "status": "configured",
            "mode": "live",
            "label": "OpenAI vision (gpt-4o-mini) for species & health analysis",
            "reachable": True,
            "error": None,
            "provider": "openai",
        }
    if settings.gemini_api_key:
        return {
            "status": "configured",
            "mode": "live",
            "label": "Google Gemini vision for species & health analysis",
            "reachable": True,
            "error": None,
            "provider": "gemini",
        }
    return {
        "status": "estimate",
        "mode": "estimate",
        "label": "Deterministic estimate model (configure OPENAI_API_KEY or GEMINI_API_KEY for live AI)",
        "reachable": True,
        "error": None,
        "provider": "stub",
    }


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


_service: AIService | None = None


def reset_ai_service() -> None:
    """Clear cached service (tests and credential hot-reload)."""
    global _service
    _service = None


def get_ai_service() -> AIService:
    global _service
    if _service is not None:
        return _service
    if settings.openai_api_key or settings.gemini_api_key:
        _service = LLMEnhancedAIService()
    else:
        _service = StubAIService()
    return _service
