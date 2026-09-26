"""Optional OpenAI narrative for executive intelligence brief."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("intelligence.brief_llm")

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-4o-mini"


async def enrich_executive_brief_llm(
    *,
    summary: dict[str, Any],
    rules: dict[str, Any],
) -> str | None:
    if not settings.openai_api_key:
        return None

    payload = {
        "highest_risk": summary.get("highest_risk"),
        "weather_alert_count": summary.get("weather_alert_count"),
        "pest_high_count": summary.get("pest_high_count"),
        "pest_hotspots": (summary.get("pest_hotspots") or [])[:3],
        "biodiversity": summary.get("biodiversity"),
        "draft_lines": rules.get("lines", []),
        "priority_alert": rules.get("priority_alert"),
    }
    system = (
        "You are a forestry operations advisor. Write one calm, actionable sentence "
        "for an executive dashboard briefing. No markdown, max 180 characters."
    )
    user_msg = json.dumps(payload, indent=2)

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                OPENAI_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user_msg},
                    ],
                    "max_tokens": 120,
                    "temperature": 0.4,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = (data["choices"][0]["message"]["content"] or "").strip()
            return text[:400] if text else None
    except Exception as exc:
        log.warning("executive_brief_llm.failed", error=str(exc))
        return None
