"""Google Perch v2 multi-taxa identification via ONNX Runtime."""

from __future__ import annotations

from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.bioacoustic_types import SpeciesDetection
from app.services.bioacoustic.perch_labels import (
    load_perch_labels,
    scientific_name_from_label,
    taxon_group_for_label,
)
from app.services.bioacoustic.taxon_groups import (
    TAXON_BIRD,
    detection_taxon_group,
    normalize_taxon_group,
    parse_taxa_csv,
)

log = get_logger("bioacoustic.perch")

_WINDOW_SAMPLES = 160_000  # 5 s @ 32 kHz
_SAMPLE_RATE = 32_000
_DEFAULT_HOP_SAMPLES = 80_000  # 2.5 s hop


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50, 50)))


def _resolve_model_path() -> Path | None:
    raw = settings.bioacoustic_perch_model_path
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


def _resolve_labels_path() -> Path | None:
    raw = settings.bioacoustic_perch_labels_path
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


@lru_cache(maxsize=1)
def _labels() -> tuple[str, ...]:
    labels_path = _resolve_labels_path()
    if not labels_path:
        return ()
    return tuple(load_perch_labels(labels_path))


@lru_cache(maxsize=1)
def _session() -> Any | None:
    model_path = _resolve_model_path()
    if not model_path:
        return None
    try:
        import onnxruntime as ort
    except ImportError:
        return None
    providers = ["CPUExecutionProvider"]
    try:
        return ort.InferenceSession(str(model_path), providers=providers)
    except Exception as exc:
        log.warning("perch_session_failed", error=str(exc))
        return None


def perch_available() -> bool:
    if not settings.bioacoustic_enable_perch:
        return False
    return _session() is not None and len(_labels()) > 0


def _enabled_taxa(*, exclude_birds: bool) -> set[str]:
    configured = parse_taxa_csv(settings.bioacoustic_perch_taxa)
    if configured:
        taxa = configured
    else:
        taxa = {normalize_taxon_group(t) for t in ("amphibian", "mammal", "insect", "reptile")}
    if exclude_birds:
        taxa.discard(TAXON_BIRD)
    return taxa


def _load_audio_windows(wav_path: str) -> list[tuple[float, np.ndarray]]:
    try:
        import librosa
    except ImportError:
        return []

    y, _ = librosa.load(wav_path, sr=_SAMPLE_RATE, mono=True)
    if len(y) < _WINDOW_SAMPLES // 4:
        return []

    hop = settings.bioacoustic_perch_hop_samples or _DEFAULT_HOP_SAMPLES
    windows: list[tuple[float, np.ndarray]] = []
    for start in range(0, max(1, len(y) - _WINDOW_SAMPLES + 1), hop):
        chunk = y[start : start + _WINDOW_SAMPLES]
        if len(chunk) < _WINDOW_SAMPLES:
            chunk = np.pad(chunk, (0, _WINDOW_SAMPLES - len(chunk)))
        start_sec = start / _SAMPLE_RATE
        windows.append((start_sec, chunk.astype(np.float32)))
    if not windows:
        padded = np.pad(y, (0, max(0, _WINDOW_SAMPLES - len(y)))).astype(np.float32)
        windows.append((0.0, padded[:_WINDOW_SAMPLES]))
    return windows


def _run_window(session: Any, audio: np.ndarray) -> np.ndarray:
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: audio.reshape(1, -1)})
    output_names = [o.name for o in session.get_outputs()]
    if "label" in output_names:
        idx = output_names.index("label")
        return np.asarray(outputs[idx][0])
    return np.asarray(outputs[-1][0])


def run_perch(
    wav_path: str,
    *,
    duration_seconds: float,
    exclude_birds: bool = True,
) -> list[SpeciesDetection]:
    """
    Run Perch v2 ONNX over sliding 5 s windows.
    Returns species detections for enabled non-bird taxa by default.
    """
    session = _session()
    labels = _labels()
    if session is None or not labels:
        return []

    enabled_taxa = _enabled_taxa(exclude_birds=exclude_birds)
    if not enabled_taxa:
        return []

    min_conf = settings.bioacoustic_perch_min_confidence
    top_k = settings.bioacoustic_perch_top_k
    windows = _load_audio_windows(wav_path)
    if not windows:
        return []

    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "common_name": "",
            "confidence_sum": 0.0,
            "call_count": 0,
            "intervals": [],
            "taxon_group": TAXON_BIRD,
        }
    )

    for start_sec, chunk in windows:
        try:
            logits = _run_window(session, chunk)
        except Exception as exc:
            log.warning("perch_window_failed", error=str(exc))
            continue

        if logits.size != len(labels):
            size = min(logits.size, len(labels))
            logits = logits[:size]
            label_slice = labels[:size]
        else:
            label_slice = labels

        scores = _sigmoid(logits)
        candidate_idx = np.where(scores >= min_conf)[0]
        if candidate_idx.size == 0:
            continue
        if candidate_idx.size > top_k:
            candidate_idx = candidate_idx[np.argsort(scores[candidate_idx])[-top_k:]]

        end_sec = min(duration_seconds, start_sec + 5.0)
        for idx in candidate_idx:
            label = label_slice[int(idx)]
            sci = scientific_name_from_label(label)
            if not sci:
                continue
            taxon = taxon_group_for_label(label)
            if taxon not in enabled_taxa:
                continue
            row = grouped[sci]
            row["common_name"] = label
            conf = float(scores[int(idx)])
            row["confidence_sum"] += conf
            row["call_count"] += 1
            row["taxon_group"] = taxon
            row["intervals"].append({"start_s": round(start_sec, 2), "end_s": round(end_sec, 2)})

    detections: list[SpeciesDetection] = []
    for sci, row in grouped.items():
        calls = int(row["call_count"])
        avg_conf = row["confidence_sum"] / calls if calls else 0.0
        detections.append(
            SpeciesDetection(
                scientific_name=sci,
                common_name=row["common_name"],
                taxon_group=detection_taxon_group(row["taxon_group"]),
                confidence=round(avg_conf, 4),
                call_count=calls,
                time_intervals=row["intervals"] or None,
            )
        )
    detections.sort(key=lambda d: d.call_count, reverse=True)
    log.info(
        "perch_complete",
        windows=len(windows),
        species=len(detections),
        taxa=sorted({normalize_taxon_group(d.taxon_group) for d in detections}),
    )
    return detections
