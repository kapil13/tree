"""Ecoacoustic indices: ACI, ADI, AEI, BI, NDSI (soundscape ecology)."""

from __future__ import annotations

from typing import Any

import numpy as np

from app.core.logging import get_logger

log = get_logger("bioacoustic.ecoacoustic")


def compute_ecoacoustic_indices(wav_path: str) -> dict[str, Any]:
    """Compute standard ecoacoustic indices from a mono WAV file."""
    try:
        import librosa
    except ImportError:
        return _empty_indices()

    try:
        y, sr = librosa.load(wav_path, sr=48000, mono=True, duration=180.0)
        if len(y) < sr:
            return _empty_indices()

        hop = 512
        n_fft = 2048
        S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop))
        S_db = librosa.amplitude_to_db(S, ref=np.max)

        aci = _acoustic_complexity_index(S_db)
        adi = _acoustic_diversity_index(S_db)
        aei = _acoustic_evenness_index(S_db)
        bi = _bioacoustic_index(S_db, sr, hop)
        ndsi = _ndsi(y, sr)

        return {
            "acoustic_complexity_index": round(aci, 4),
            "acoustic_diversity_index": round(adi, 4),
            "acoustic_evenness_index": round(aei, 4),
            "bioacoustic_index": round(bi, 4),
            "ndsi": round(ndsi, 4),
            "aci_normalized": round(min(aci / 2000.0, 1.0), 4),
        }
    except Exception as exc:
        log.warning("ecoacoustic_failed", error=str(exc))
        return _empty_indices()


def _empty_indices() -> dict[str, Any]:
    return {
        "acoustic_complexity_index": 0.0,
        "acoustic_diversity_index": 0.0,
        "acoustic_evenness_index": 0.0,
        "bioacoustic_index": 0.0,
        "ndsi": 0.0,
        "aci_normalized": 0.0,
    }


def _acoustic_complexity_index(S_db: np.ndarray) -> float:
    """Pieretti ACI: sum of temporal amplitude variation across frequency bins."""
    diffs = np.abs(np.diff(S_db, axis=1))
    return float(np.sum(diffs))


def _acoustic_diversity_index(S_db: np.ndarray) -> float:
    """ADI: Shannon entropy of proportional energy per frequency band."""
    band_energy = np.mean(S_db, axis=1)
    band_energy = band_energy - np.min(band_energy) + 1e-6
    p = band_energy / np.sum(band_energy)
    h = -np.sum(p * np.log(p + 1e-12))
    return float(h)


def _acoustic_evenness_index(S_db: np.ndarray) -> float:
    """AEI: evenness of energy distribution across bands (0–1)."""
    band_energy = np.mean(10 ** (S_db / 10.0), axis=1)
    total = np.sum(band_energy)
    if total <= 0:
        return 0.0
    p = band_energy / total
    s = len(p)
    if s <= 1:
        return 0.0
    h = -np.sum(p * np.log(p + 1e-12))
    h_max = np.log(s)
    return float(h / h_max) if h_max > 0 else 0.0


def _bioacoustic_index(S_db: np.ndarray, sr: int, hop: int) -> float:
    """Simplified BI: proportion of frames with biophony-dominated energy (2–8 kHz)."""
    import librosa

    n_fft = (S_db.shape[0] - 1) * 2
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    bio_mask = (freqs >= 2000) & (freqs <= 8000)
    if not bio_mask.any():
        return 0.0
    bio = np.mean(10 ** (S_db[bio_mask, :] / 10.0))
    all_e = np.mean(10 ** (S_db / 10.0))
    return float(bio / (all_e + 1e-12))


def _ndsi(y: np.ndarray, sr: int) -> float:
    """Normalized Difference Soundscape Index (biophony vs anthropophony proxy)."""
    import librosa

    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    bio = np.mean(S[(freqs >= 2000) & (freqs <= 8000), :])
    anthro = np.mean(S[(freqs >= 1000) & (freqs <= 2000), :])
    denom = bio + anthro
    if denom <= 0:
        return 0.0
    return float((bio - anthro) / denom)
