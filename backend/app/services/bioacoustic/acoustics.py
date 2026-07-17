"""Approximate sound pressure level (SPL) and SNR from environmental recordings."""

from __future__ import annotations

from typing import Any

import numpy as np

from app.core.logging import get_logger

log = get_logger("bioacoustic.acoustics")

# Uncalibrated smartphone offset (dBFS → approximate SPL). Not a certified sound level meter.
_SPL_OFFSET_DB = 90.0


def measure_spl_from_audio(y: np.ndarray, sr: int) -> dict[str, Any]:
    """Estimate ambient SPL metrics from mono waveform (uncalibrated)."""
    if len(y) == 0:
        return {
            "avg_db_spl_approx": 0.0,
            "max_db_spl_approx": 0.0,
            "background_db_spl_approx": 0.0,
            "snr_db_approx": 0.0,
            "calibrated": False,
            "warning_high_noise": False,
        }

    frame = max(1, int(sr * 0.05))
    rms_frames = []
    for i in range(0, len(y), frame):
        chunk = y[i : i + frame]
        if len(chunk) < frame // 4:
            continue
        rms_frames.append(float(np.sqrt(np.mean(chunk**2))))

    if not rms_frames:
        rms_frames = [float(np.sqrt(np.mean(y**2)))]

    dbfs = [20.0 * np.log10(r + 1e-12) for r in rms_frames]
    spl = [d + _SPL_OFFSET_DB for d in dbfs]

    avg_spl = float(np.mean(spl))
    max_spl = float(np.max(spl))
    bg_spl = float(np.percentile(spl, 20))
    snr = max_spl - bg_spl

    return {
        "avg_db_spl_approx": round(avg_spl, 1),
        "max_db_spl_approx": round(max_spl, 1),
        "background_db_spl_approx": round(bg_spl, 1),
        "snr_db_approx": round(snr, 1),
        "calibrated": False,
        "warning_high_noise": avg_spl >= 62.0,
        "environment_hint": _environment_hint(avg_spl),
    }


def measure_spl_from_wav(wav_path: str) -> dict[str, Any]:
    try:
        import librosa

        y, sr = librosa.load(wav_path, sr=48000, mono=True)
        return measure_spl_from_audio(y, sr)
    except Exception as exc:
        log.warning("spl_measure_failed", error=str(exc))
        return measure_spl_from_audio(np.array([]), 48000)


def _environment_hint(avg_spl: float) -> str:
    if avg_spl < 35:
        return "very_quiet"
    if avg_spl < 45:
        return "forest"
    if avg_spl < 55:
        return "woodland"
    if avg_spl < 65:
        return "urban_park"
    return "noisy_anthropogenic"
