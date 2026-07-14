"""Audio pre-processing metadata (noise reduction + spectrogram stub)."""

from __future__ import annotations

import hashlib


def preprocess_audio(audio_bytes: bytes, *, s3_key: str) -> dict:
    """
    Stub pre-processing pipeline.
    Production: noise reduction, band-pass filter, mel-spectrogram generation.
    """
    digest = hashlib.sha256(audio_bytes).hexdigest()[:16]
    return {
        "noise_reduction": "spectral_subtraction_stub",
        "sample_rate_hz": 44100,
        "channels": 1,
        "duration_analyzed_s": round(len(audio_bytes) / 88200, 2) if audio_bytes else 0,
        "spectrogram_generated": True,
        "spectrogram_s3_key": f"bioacoustic/spectrograms/{digest}.png",
        "audio_fingerprint": digest,
        "source_key": s3_key,
    }
