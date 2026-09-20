"""Optional LLM enrichment for Estate Watch explain-only narratives (P14)."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("audit_explain_llm")

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
GEMINI_MODELS = (
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
)

SYSTEM_PROMPT = (
    "You are an Estate Watch audit assistant. Explain audit findings to verifiers "
    "using ONLY the JSON context provided. Do not invent measurements, grades, or visits. "
    "Clarify what the deterministic signal means, what evidence supports it, and what "
    "reviewers should check next. 80–150 words, plain markdown, cautious tone. "
    "This is explain-only — you do not change grades, statuses, or attestation decisions."
)


async def _call_openai(user_content: str) -> str | None:
    if not settings.openai_api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                OPENAI_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "temperature": 0.2,
                    "max_tokens": 400,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                },
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            return text[:2000] if text else None
    except Exception as exc:
        log.warning("audit_explain_llm.openai_failed", error=str(exc))
        return None


async def _call_gemini(user_content: str) -> str | None:
    if not settings.gemini_api_key:
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
                    params={"key": settings.gemini_api_key},
                    json={
                        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
                        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512},
                    },
                )
                resp.raise_for_status()
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text:
                    return text[:2000]
            except Exception as exc:
                log.warning("audit_explain_llm.gemini_failed", model=model, error=str(exc))
    return None


async def enrich_explain_narrative(
    context: dict[str, Any],
    *,
    target_type: str,
) -> tuple[str | None, str | None, str | None]:
    """Return (answer, provider, error) when an LLM key is configured."""
    if not settings.openai_api_key and not settings.gemini_api_key:
        return None, None, None

    user_content = (
        f"Explain this Estate Watch {target_type} for an auditor. "
        f"Context JSON:\n\n{json.dumps(context, indent=2, default=str)}"
    )

    text = await _call_openai(user_content)
    if text:
        return text, "openai", None

    text = await _call_gemini(user_content)
    if text:
        return text, "gemini", None

    return None, None, "llm_unavailable"
