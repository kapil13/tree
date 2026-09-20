"""Deterministic explain-only narratives for Estate Watch (P14 fallback)."""

from __future__ import annotations

from typing import Any


def explain_anomaly(context: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    anomaly = context.get("anomaly") or {}
    block_name = context.get("boundary_name") or "the block"
    anomaly_type = anomaly.get("anomaly_type", "unknown")
    severity = anomaly.get("severity", "medium")
    title = anomaly.get("title") or anomaly_type.replace("_", " ").title()
    summary = anomaly.get("summary") or ""
    signals = anomaly.get("signals") or {}

    lines = [
        f"**{title}** ({severity} severity) on {block_name}.",
        summary,
    ]
    if signals:
        signal_bits = ", ".join(f"{k}={v}" for k, v in list(signals.items())[:4])
        lines.append(f"Signals: {signal_bits}.")
    lines.append(
        "This is a deterministic audit observation — review field visits and satellite "
        "timeline before changing confidence grades or attestation."
    )

    citations = [
        {"source": "audit_anomaly_events", "id": str(anomaly.get("id", ""))},
        {"source": "boundary_versions", "name": block_name},
    ]
    return "\n\n".join(lines), citations


def explain_reconciliation_block(context: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    block = context.get("block") or {}
    name = block.get("boundary_name") or "the block"
    reconciliation = block.get("reconciliation", "unknown")
    conf = block.get("confidence_grade")
    field = block.get("field_grade")
    visits = block.get("visit_count", 0)

    if reconciliation == "aligned":
        body = (
            f"Satellite confidence ({conf}) and field verification ({field}) are aligned "
            f"for {name} across {visits} visit(s)."
        )
    elif reconciliation == "no_field_data":
        body = (
            f"No completed field visits for {name} while confidence grade is {conf}. "
            "Schedule or complete plot visits before export or attestation."
        )
    else:
        body = (
            f"Confidence grade **{conf}** does not align with field grade **{field}** "
            f"on {name} ({visits} visit(s)). Investigate visit outcomes and tree presence counts."
        )

    outcome_counts = block.get("outcome_counts") or {}
    if outcome_counts:
        body += f" Field outcomes: {outcome_counts}."

    citations = [
        {"source": "audit_confidence_assessments", "boundary": name},
        {"source": "audit_field_visits", "visit_count": str(visits)},
    ]
    return body, citations


def explain_reconciliation_summary(context: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    summary = context.get("reconciliation") or {}
    aligned = summary.get("aligned_count", 0)
    mismatch = summary.get("mismatch_count", 0)
    no_field = summary.get("no_field_data_count", 0)
    total = summary.get("block_count", 0)

    answer = (
        f"Reconciliation across {total} block(s): {aligned} aligned, "
        f"{mismatch} mismatch, {no_field} without field data. "
    )
    if mismatch > 0:
        answer += "Prioritize mismatch blocks for reviewer disposition before attestation."
    elif no_field > 0:
        answer += "Complete remaining field visits to close reconciliation gaps."
    else:
        answer += "All assessed blocks are aligned between satellite confidence and field signals."

    citations = [{"source": "audit_reconciliation", "block_count": str(total)}]
    return answer, citations


def explain_cross_estate_pattern(context: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    pattern = context.get("pattern") or {}
    summary = pattern.get("summary") or ""
    pattern_type = pattern.get("pattern_type", "pattern")
    count = pattern.get("engagement_count", 0)
    severity = pattern.get("severity_peak")

    answer = (
        f"Cross-estate pattern **{pattern_type}** affects {count} engagement(s)"
        f"{f' (peak severity: {severity})' if severity else ''}. "
        f"{summary} "
        "Use the auditor workspace queue to coordinate field follow-up across estates."
    )
    citations = [
        {"source": "audit_cross_estate_patterns", "id": str(pattern.get("id", ""))},
    ]
    return answer, citations


def explain_evidence_graph(context: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    graph = context.get("graph") or {}
    nodes = graph.get("node_count", 0)
    edges = graph.get("edge_count", 0)
    node_types: dict[str, int] = {}
    for node in graph.get("nodes") or []:
        nt = node.get("node_type", "unknown")
        node_types[nt] = node_types.get(nt, 0) + 1

    type_summary = ", ".join(f"{k}={v}" for k, v in sorted(node_types.items()))
    answer = (
        f"Evidence graph for this cycle links {nodes} node(s) and {edges} edge(s) "
        f"({type_summary or 'no nodes yet'}). "
        "Claims flow through estimations and observations to attestation — gaps usually "
        "mean missing field visits, confidence assessments, or unsigned attestation."
    )
    citations = [{"source": "audit_evidence_graph", "cycle_id": graph.get("cycle_id", "")}]
    return answer, citations
