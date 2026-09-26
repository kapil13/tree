"""Optional LLM narrative enrichment for satellite NDVI health results."""

from __future__ import annotations

import json

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.satellite_health_types import NdviObservation, SatelliteHealthResult

log = get_logger("satellite_health_llm")

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
GEMINI_MODELS = (
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
)

SYSTEM_PROMPT = (
    "You are an agronomist advising farmers from Sentinel-2 NDVI satellite data. "
    "Write 2–4 clear sentences summarizing crop/tree health, likely causes, and "
    "whether pest or disease treatment is needed. Add a short bullet list (max 3) "
    "of immediate actions. Be practical, region-agnostic, and cautious — recommend "
    "ground scouting before chemicals. Do not invent data beyond the JSON provided."
)


def _build_prompt(
    result: SatelliteHealthResult,
    observations: list[NdviObservation],
    *,
    species_hint: str | None,
    target_label: str,
) -> str:
    ndvi_series = [
        {
            "date": o.scene_acquired_at.date().isoformat(),
            "ndvi_mean": round(o.ndvi_mean, 3),
            "ndvi_min": round(o.ndvi_min, 3) if o.ndvi_min is not None else None,
            "ndvi_max": round(o.ndvi_max, 3) if o.ndvi_max is not None else None,
        }
        for o in observations[-6:]
    ]
    payload = {
        "target": target_label,
        "species_hint": species_hint,
        "risk_level": result.risk_level,
        "health_status": result.health_status,
        "ndvi_current": result.ndvi_current,
        "ndvi_trend": result.ndvi_trend,
        "pest_control_needed": result.pest_control_needed,
        "disease_control_needed": result.disease_control_needed,
        "findings": [
            {"name": f.name, "severity": f.severity, "evidence": f.evidence}
            for f in result.findings
        ],
        "treatments": [
            {"category": t.category, "action": t.action, "timing": t.timing}
            for t in result.treatments[:5]
        ],
        "ndvi_series": ndvi_series,
        "rule_summary": result.summary,
    }
    return json.dumps(payload, indent=2)


async def _call_openai(user_content: str) -> str | None:
    api_key = settings.openai_api_key
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                OPENAI_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "temperature": 0.35,
                    "max_tokens": 450,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                },
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            return text[:1900] if text else None
    except Exception as exc:
        log.warning("satellite_health_llm.openai_failed", error=str(exc))
        return None


async def _call_gemini(user_content: str) -> str | None:
    api_key = settings.gemini_api_key
    if not api_key:
        return None
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
                    json={
                        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
                        "generationConfig": {
                            "temperature": 0.35,
                            "maxOutputTokens": 512,
                        },
                    },
                )
                resp.raise_for_status()
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text:
                    return text[:1900]
            except Exception as exc:
                log.warning("satellite_health_llm.gemini_failed", model=model, error=str(exc))
    return None


async def enrich_satellite_health_narrative(
    result: SatelliteHealthResult,
    observations: list[NdviObservation],
    *,
    species_hint: str | None = None,
    target_label: str = "plantation area",
) -> str | None:
    """Return farmer-facing narrative when OPENAI_API_KEY or GEMINI_API_KEY is set."""
    if not settings.openai_api_key and not settings.gemini_api_key:
        return None

    user_content = (
        "Analyse this satellite health JSON and respond in plain language for the farmer:\n\n"
        + _build_prompt(result, observations, species_hint=species_hint, target_label=target_label)
    )

    text = await _call_openai(user_content)
    if text:
        return text
    return await _call_gemini(user_content)
