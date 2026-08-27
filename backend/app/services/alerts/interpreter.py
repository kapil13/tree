"""Plain-language preparedness copy for environmental alerts and threat watch."""

from __future__ import annotations

from typing import Any

PreparednessBrief = dict[str, Any]

STRONG_METHANE_ANOMALY_PPB = 15.0


def _urgency_from_severity(severity: str) -> str:
    if severity in ("critical", "high"):
        return "today"
    if severity in ("warning", "moderate", "medium"):
        return "this_week"
    return "monitor"


def _site_name(payload: dict[str, Any]) -> str:
    return str(payload.get("work_area_name") or payload.get("fence_name") or "your site")


def interpret_weather_subkind(
    subkind: str,
    *,
    severity: str,
    payload: dict[str, Any],
    message: str,
) -> PreparednessBrief:
    site = _site_name(payload)
    date = payload.get("date")
    when = f" on {date}" if date else " soon"
    precip = payload.get("precipitation_mm")
    temp = payload.get("temp_max_c")

    templates: dict[str, PreparednessBrief] = {
        "heavy_rain": {
            "headline": f"Heavy rain expected at {site}",
            "meaning": (
                f"{'About ' + str(int(precip)) + ' mm of rain is' if precip else 'Significant rain is'} "
                f"forecast{when}. Pits and young saplings can waterlog quickly on slopes."
            ),
            "prepare": [
                "Clear drainage channels and check pit outlets before rain starts",
                "Secure tree guards and mulch on exposed slopes",
                "Plan a field walk 24–48 hours after rain to spot fungal leaf spots",
            ],
            "category": "weather",
        },
        "rain": {
            "headline": f"Rain in the forecast at {site}",
            "meaning": (
                f"Moderate rain{when} helps establishment but can trigger pest flare-ups afterward."
            ),
            "prepare": [
                "Note low-lying rows that tend to hold water",
                "Scout for pests 3–5 days after the wet spell",
            ],
            "category": "weather",
        },
        "hail_storm": {
            "headline": f"Hail risk at {site} — protect young stock",
            "meaning": f"Hail-bearing storms are forecast{when}. Nursery and newly planted saplings are most vulnerable.",
            "prepare": [
                "Move or cover nursery stock if possible",
                "Inspect saplings immediately after the storm for broken leaders",
                "Photograph damage for compliance records if losses occur",
            ],
            "category": "weather",
        },
        "thunderstorm": {
            "headline": f"Thunderstorms expected at {site}",
            "meaning": f"Storms{when} bring wind, brief heavy rain, and spraying delays.",
            "prepare": [
                "Postpone pesticide or foliar spraying until conditions settle",
                "Secure loose mulch and tree guards",
                "Avoid field work under open sky during lightning risk",
            ],
            "category": "weather",
        },
        "heat_stress": {
            "headline": f"Heat stress likely at {site}",
            "meaning": (
                f"Peak temperatures around {int(temp)}°C{when} increase wilting and pest pressure on saplings."
                if temp
                else f"High heat{when} increases wilting and pest pressure on saplings."
            ),
            "prepare": [
                "Schedule watering or irrigation checks early morning",
                "Watch for wilting on outer rows and bare soil patches",
                "Delay heavy planting until the heat wave passes if possible",
            ],
            "category": "weather",
        },
        "high_wind": {
            "headline": f"Strong winds expected at {site}",
            "meaning": f"High winds{when} can uproot fresh plantings and scatter mulch.",
            "prepare": [
                "Stake or re-tie young trees where guards are loose",
                "Secure shade nets and nursery covers",
            ],
            "category": "weather",
        },
        "frost": {
            "headline": f"Frost risk at {site}",
            "meaning": f"Frost{when} can damage tender shoots and nursery stock.",
            "prepare": [
                "Cover sensitive nursery beds overnight if feasible",
                "Delay transplanting tender species until frost passes",
            ],
            "category": "weather",
        },
    }

    brief = dict(templates.get(subkind, {}))
    if not brief:
        brief = {
            "headline": f"Weather alert at {site}",
            "meaning": message or "Weather conditions may affect field work this week.",
            "prepare": ["Review the detailed forecast and adjust field schedules"],
            "category": "weather",
        }
    brief["urgency"] = _urgency_from_severity(severity)
    return brief


def interpret_emission_fusion(
    *,
    verdict: str,
    anomaly_ppb: float | None,
    alignment_score: float | None,
    gas_type: str = "CH4",
    work_area_name: str = "work area",
) -> PreparednessBrief:
    gas_label = {"CH4": "methane", "CO2": "carbon dioxide", "N2O": "nitrous oxide"}.get(
        gas_type, gas_type
    )
    ppb = anomaly_ppb or 0.0
    score = alignment_score or 0.0

    if verdict == "consistent" and ppb >= STRONG_METHANE_ANOMALY_PPB:
        return {
            "headline": f"Elevated {gas_label} detected — matches declared sources",
            "meaning": (
                f"Satellite sees about +{ppb:.1f} ppb {gas_label} over {work_area_name}, "
                "and it lines up with your registered emission sources and wind direction."
            ),
            "prepare": [
                "Log this scan for compliance — no immediate field action required",
                "Keep source registry and dispersion model up to date for audits",
            ],
            "urgency": "monitor",
            "category": "methane",
        }

    if verdict in ("misaligned", "uncertain") or ppb >= STRONG_METHANE_ANOMALY_PPB:
        return {
            "headline": f"Check {gas_label} signals at {work_area_name}",
            "meaning": (
                f"Satellite shows +{ppb:.1f} ppb {gas_label} anomaly (alignment {score:.0f}/100). "
                "The plume may not match declared sources — verify before reporting or audit."
            ),
            "prepare": [
                "Open the emissions panel and review TROPOMI scan + fusion findings",
                "Confirm emission source locations and activity dates on the ground",
                "Re-run dispersion after updating sources if the signal persists",
                "Document findings if anomaly is unexplained for compliance",
            ],
            "urgency": "this_week" if verdict == "misaligned" else "monitor",
            "category": "methane",
        }

    return {
        "headline": f"No strong {gas_label} anomaly at {work_area_name}",
        "meaning": "Latest satellite scan does not show a significant elevation over baseline.",
        "prepare": ["Continue routine monitoring on your normal schedule"],
        "urgency": "monitor",
        "category": "methane",
    }


def interpret_alert(
    *,
    kind: str,
    severity: str,
    title: str,
    message: str,
    payload: dict[str, Any] | None = None,
) -> PreparednessBrief:
    """Return plain-language headline, meaning, and prepare steps for an inbox alert."""
    payload = payload or {}
    site = _site_name(payload)
    urgency = _urgency_from_severity(severity)

    if kind.startswith("weather_"):
        return interpret_weather_subkind(
            kind.removeprefix("weather_"),
            severity=severity,
            payload=payload,
            message=message,
        )

    if kind in ("emission_anomaly_detected", "emission_fusion_misaligned"):
        result = payload.get("fusion_result") or {}
        return interpret_emission_fusion(
            verdict=str(payload.get("verdict") or result.get("verdict") or "misaligned"),
            anomaly_ppb=_float_or_none(payload.get("anomaly_ppb") or result.get("anomaly_ppb")),
            alignment_score=_float_or_none(payload.get("alignment_score") or result.get("alignment_score")),
            gas_type=str(payload.get("gas_type") or "CH4"),
            work_area_name=site,
        )

    if kind.startswith("pest_intel_"):
        return {
            "headline": f"Pest or disease pressure at {site}",
            "meaning": (
                "Satellite health and weather together suggest pests or disease may be active. "
                + (message[:200] if message else "")
            ),
            "prepare": [
                "Walk plantation rows within 72 hours and note chewed or spotted leaves",
                "Target scouting on outer rows and stressed trees first",
                "Record treatment actions for compliance if control is applied",
            ],
            "urgency": "today" if severity == "critical" else "this_week",
            "category": "pest",
        }

    if kind == "locust_watch":
        dist = payload.get("distance_km")
        dist_txt = f" (~{dist} km from known corridors)" if dist else ""
        return {
            "headline": f"Locust watch near {site}",
            "meaning": (message or f"Locust activity may affect this area{dist_txt}."),
            "prepare": [
                "Scout field edges and bare ground in early morning",
                "Report hopper bands to district agriculture office if seen",
                "Avoid unnecessary spraying until species is confirmed",
            ],
            "urgency": "today" if severity in ("critical", "high") else "this_week",
            "category": "pest",
        }

    if kind.startswith("sar_"):
        return {
            "headline": title,
            "meaning": (
                message
                or "Radar monitoring shows a change in forest or ground conditions at this site."
            ),
            "prepare": [
                "Open the satellite map and compare with the last scan",
                "If integrity dropped, schedule a ground truth visit within one week",
                "Check for logging, fire, flood, or moisture stress on the ground",
            ],
            "urgency": urgency,
            "category": "satellite",
        }

    if kind in ("ndvi_degradation", "satellite_health_high", "satellite_health_critical"):
        return {
            "headline": title,
            "meaning": message or f"Canopy greenness at {site} needs a closer look.",
            "prepare": [
                "Review NDVI trend on the satellite page",
                "Rule out drought, pest, or recent planting failure on a field visit",
            ],
            "urgency": urgency,
            "category": "canopy",
        }

    if kind.startswith("compliance"):
        return {
            "headline": title,
            "meaning": message or "A compliance item needs attention before your next audit window.",
            "prepare": [
                "Open the project compliance tab and resolve open items",
                "Assign an owner and target date for each violation",
            ],
            "urgency": "today" if severity in ("critical", "high") else "this_week",
            "category": "compliance",
        }

    return {
        "headline": title,
        "meaning": message or "Review this signal and decide if field action is needed.",
        "prepare": ["Open the linked view for details", "Assign follow-up if the risk affects planting"],
        "urgency": urgency,
        "category": "general",
    }


def build_site_preparedness_brief(site: dict[str, Any]) -> PreparednessBrief:
    """Aggregate the strongest site signals into one human-readable brief."""
    name = site.get("work_area_name") or "Site"
    weather = [
        a
        for a in site.get("weather_alerts", [])
        if a.get("severity") in ("warning", "critical")
    ]
    early = site.get("early_warnings") or []
    composite = site.get("composite_risk", "low")
    rain = float(site.get("rain_mm_next_48h") or 0)

    prepare: list[str] = list(site.get("recommended_actions") or [])[:4]

    if weather:
        top = max(weather, key=lambda a: _severity_rank(a.get("severity", "info")))
        sub = interpret_weather_subkind(
            top.get("kind", "rain"),
            severity=top.get("severity", "warning"),
            payload={"work_area_name": name, "date": top.get("date"), **top},
            message=top.get("message", ""),
        )
        sub["prepare"] = list(dict.fromkeys(sub.get("prepare", []) + prepare))[:5]
        return sub

    if any(w.get("kind") == "locust" for w in early):
        loc = next(w for w in early if w.get("kind") == "locust")
        brief = interpret_alert(
            kind="locust_watch",
            severity=loc.get("severity", "warning"),
            title=loc.get("title", "Locust watch"),
            message=loc.get("message", ""),
            payload={"work_area_name": name, "distance_km": loc.get("distance_km")},
        )
        brief["prepare"] = list(dict.fromkeys(brief.get("prepare", []) + prepare))[:5]
        return brief

    if composite in ("high", "critical"):
        return {
            "headline": f"Pest or disease risk elevated at {name}",
            "meaning": (
                f"Satellite and weather signals together show {composite} risk. "
                f"About {rain:.0f} mm rain may fall in the next 48 hours."
            ),
            "prepare": prepare
            or [
                "Scout outer rows and stressed trees within 72 hours",
                "Look for chewed leaves, scale, or fungal spots after rain",
            ],
            "urgency": "today" if composite == "critical" else "this_week",
            "category": "pest",
        }

    if rain >= 35:
        return {
            "headline": f"Wet spell ahead at {name}",
            "meaning": f"Roughly {rain:.0f} mm of rain expected in 48 hours — good for growth but watch for secondary pests.",
            "prepare": prepare
            or [
                "Check drainage before rain",
                "Scout for pests 3–5 days after the wet spell",
            ],
            "urgency": "this_week",
            "category": "weather",
        }

    summary = site.get("forecast_summary") or "Conditions look manageable this week."
    return {
        "headline": f"No urgent threats at {name}",
        "meaning": summary,
        "prepare": prepare or ["Continue routine monitoring and survival checks"],
        "urgency": "monitor",
        "category": "general",
    }


def attach_interpretation(payload: dict[str, Any], brief: PreparednessBrief) -> dict[str, Any]:
    merged = dict(payload)
    merged["interpretation"] = brief
    return merged


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _severity_rank(severity: str) -> int:
    return {"info": 0, "moderate": 1, "medium": 1, "warning": 2, "high": 3, "critical": 4}.get(
        severity, 0
    )
