"""LLM vision analysis for tree species and health (OpenAI / Gemini)."""

from __future__ import annotations

import base64
import json
import re
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.types import (
    DiseaseFinding,
    HealthResult,
    Recommendation,
    SpeciesPrediction,
    SpeciesResult,
)

log = get_logger("ai.llm_vision")

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
GEMINI_MODELS = (
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
)

HEALTH_CLASSES = frozenset({"healthy", "moderate", "unhealthy", "disease_risk"})
REC_TYPES = frozenset({"water", "nutrient", "pest", "general"})
REC_PRIORITIES = frozenset({"info", "warning", "critical"})
SEVERITIES = frozenset({"low", "moderate", "high"})

SYSTEM_PROMPT = """You are an arboriculture expert analyzing tree photos for a plantation monitoring platform.
Respond with JSON only (no markdown), matching this schema:
{
  "species_scientific": "Latin binomial",
  "species_common": "common name",
  "species_confidence": 0.0-1.0,
  "alternates": [{"scientific": "...", "common": "...", "confidence": 0.0-1.0}],
  "health_class": "healthy|moderate|unhealthy|disease_risk",
  "health_confidence": 0.0-1.0,
  "diseases": [{"name": "snake_case_id", "confidence": 0.0-1.0, "severity": "low|moderate|high"}],
  "recommendations": [{"type": "water|nutrient|pest|general", "text": "...", "priority": "info|warning|critical"}]
}
Be conservative with disease claims. If unsure, use health_class moderate and lower confidence."""


def _usable_images(images: list[bytes], *, limit: int = 2) -> list[bytes]:
    out: list[bytes] = []
    for blob in images:
        if not blob or blob == b"no-image" or len(blob) < 64:
            continue
        out.append(blob)
        if len(out) >= limit:
            break
    return out


def _parse_json_payload(text: str) -> dict[str, Any] | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def _clamp_confidence(value: Any, default: float = 0.7) -> float:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.05, min(0.99, round(num, 3)))


def _build_species(data: dict[str, Any], *, model: str) -> SpeciesResult:
    top = SpeciesPrediction(
        scientific_name=str(data.get("species_scientific") or "Unknown species"),
        common_name=str(data.get("species_common") or "Unknown"),
        confidence=_clamp_confidence(data.get("species_confidence")),
    )
    topk = [top]
    for alt in data.get("alternates") or []:
        if not isinstance(alt, dict):
            continue
        topk.append(
            SpeciesPrediction(
                scientific_name=str(alt.get("scientific") or "Unknown"),
                common_name=str(alt.get("common") or "Unknown"),
                confidence=_clamp_confidence(alt.get("confidence"), default=0.4),
            )
        )
    return SpeciesResult(top=top, topk=topk[:5], model=model, raw=data)


def _build_health(data: dict[str, Any], *, model: str) -> HealthResult:
    health_class = str(data.get("health_class") or "moderate")
    if health_class not in HEALTH_CLASSES:
        health_class = "moderate"
    diseases: list[DiseaseFinding] = []
    for row in data.get("diseases") or []:
        if not isinstance(row, dict):
            continue
        severity = str(row.get("severity") or "low")
        if severity not in SEVERITIES:
            severity = "low"
        diseases.append(
            DiseaseFinding(
                name=str(row.get("name") or "unknown").replace(" ", "_").lower(),
                confidence=_clamp_confidence(row.get("confidence"), default=0.55),
                severity=severity,
            )
        )
    return HealthResult(
        health_class=health_class,
        confidence=_clamp_confidence(data.get("health_confidence")),
        diseases=diseases,
        model=model,
        raw=data,
    )


def build_recommendations_from_llm(data: dict[str, Any]) -> list[Recommendation]:
    recs: list[Recommendation] = []
    for row in data.get("recommendations") or []:
        if not isinstance(row, dict):
            continue
        rec_type = str(row.get("type") or "general")
        priority = str(row.get("priority") or "info")
        text = str(row.get("text") or "").strip()
        if not text:
            continue
        recs.append(
            Recommendation(
                type=rec_type if rec_type in REC_TYPES else "general",
                text=text,
                priority=priority if priority in REC_PRIORITIES else "info",
            )
        )
    return recs


async def _call_openai(images: list[bytes], *, species_hint: str | None) -> dict[str, Any] | None:
    api_key = settings.openai_api_key
    if not api_key:
        return None

    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                f"Analyze these tree photos. Species hint from planter: {species_hint or 'none'}."
            ),
        }
    ]
    for blob in images:
        b64 = base64.standard_b64encode(blob).decode("ascii")
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            }
        )

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                OPENAI_CHAT_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": OPENAI_MODEL,
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": content},
                    ],
                },
            )
            resp.raise_for_status()
            body = resp.json()
            text = body["choices"][0]["message"]["content"]
    except Exception as exc:
        log.warning("llm_vision.openai_failed", error=str(exc))
        return None

    return _parse_json_payload(text)


async def _call_gemini(
    images: list[bytes], *, species_hint: str | None
) -> tuple[dict[str, Any] | None, str | None]:
    api_key = settings.gemini_api_key
    if not api_key:
        return None, None

    parts: list[dict[str, Any]] = [
        {
            "text": (
                f"{SYSTEM_PROMPT}\n\nAnalyze these tree photos. "
                f"Species hint from planter: {species_hint or 'none'}."
            )
        }
    ]
    for blob in images:
        parts.append(
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.standard_b64encode(blob).decode("ascii"),
                }
            }
        )

    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in GEMINI_MODELS:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent"
            )
            try:
                resp = await client.post(
                    url,
                    params={"key": api_key},
                    json={"contents": [{"parts": parts}]},
                )
                resp.raise_for_status()
                body = resp.json()
                text = body["candidates"][0]["content"]["parts"][0]["text"]
                parsed = _parse_json_payload(text)
                if parsed is not None:
                    return parsed, model
            except Exception as exc:
                log.warning("llm_vision.gemini_failed", model=model, error=str(exc))
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status in {401, 403, 429}:
                    break

    return None, None


async def analyze_tree_vision(
    images: list[bytes],
    *,
    species_hint: str | None = None,
) -> tuple[SpeciesResult, HealthResult, list[Recommendation], str] | None:
    """Return species, health, recommendations, and pipeline id when an LLM succeeds."""
    usable = _usable_images(images)
    if not usable:
        return None

    data: dict[str, Any] | None = None
    pipeline = ""
    if settings.openai_api_key:
        data = await _call_openai(usable, species_hint=species_hint)
        pipeline = f"openai/{OPENAI_MODEL}"
    if data is None and settings.gemini_api_key:
        data, gemini_model = await _call_gemini(usable, species_hint=species_hint)
        if gemini_model:
            pipeline = f"gemini/{gemini_model}"
    if data is None:
        return None

    species = _build_species(data, model=pipeline)
    health = _build_health(data, model=pipeline)
    recs = build_recommendations_from_llm(data)
    return species, health, recs, pipeline
