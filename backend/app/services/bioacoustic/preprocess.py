"""Audio pre-processing: decode, optional noise reduction, and spectrogram metadata."""

from __future__ import annotations

import hashlib
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("bioacoustic.preprocess")


def _run_ffmpeg(args: list[str]) -> bool:
    try:
        proc = subprocess.run(
            ["ffmpeg", "-y", *args],
            capture_output=True,
            check=False,
            timeout=120,
        )
        if proc.returncode != 0:
            log.warning(
                "ffmpeg_failed",
                stderr=(proc.stderr or b"").decode(errors="replace")[:500],
            )
        return proc.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        log.warning("ffmpeg_unavailable", error=str(exc))
        return False


def convert_to_wav(
    audio_bytes: bytes,
    *,
    suffix: str = ".m4a",
    noise_reduction: bool | None = None,
) -> str | None:
    """Write bytes to a temp file and convert to 48 kHz mono WAV for BirdNET."""
    use_nr = settings.bioacoustic_noise_reduction if noise_reduction is None else noise_reduction

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as src:
        src.write(audio_bytes)
        src_path = src.name
    wav_path = src_path.rsplit(".", 1)[0] + ".wav"

    # Light highpass removes rumble; aggressive afftdn often strips bird calls.
    audio_filter = "afftdn=nf=-25" if use_nr else "highpass=f=80"

    ok = _run_ffmpeg(
        [
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            src_path,
            "-ac",
            "1",
            "-ar",
            "48000",
            "-af",
            audio_filter,
            wav_path,
        ]
    )
    Path(src_path).unlink(missing_ok=True)
    if not ok:
        Path(wav_path).unlink(missing_ok=True)
        return None
    return wav_path


def preprocess_audio(audio_bytes: bytes, *, s3_key: str) -> dict[str, Any]:
    """
    WAV conversion for BirdNET plus analysis metadata.
    Falls back to fingerprint-only metadata when ffmpeg is unavailable.
    """
    digest = hashlib.sha256(audio_bytes).hexdigest()[:16]
    wav_path = convert_to_wav(audio_bytes, suffix=Path(s3_key).suffix or ".m4a")
    duration_s = 0.0
    sample_rate = 48000
    if wav_path and os.path.exists(wav_path):
        try:
            import wave

            with wave.open(wav_path, "rb") as wf:
                sample_rate = wf.getframerate()
                duration_s = wf.getnframes() / float(sample_rate or 1)
        except Exception:
            duration_s = round(len(audio_bytes) / 88200, 2) if audio_bytes else 0.0
    else:
        duration_s = round(len(audio_bytes) / 88200, 2) if audio_bytes else 0.0

    return {
        "noise_reduction": "ffmpeg_afftdn" if settings.bioacoustic_noise_reduction else "highpass_80hz",
        "sample_rate_hz": sample_rate,
        "channels": 1,
        "duration_analyzed_s": round(duration_s, 2),
        "spectrogram_generated": False,
        "spectrogram_s3_key": f"bioacoustic/spectrograms/{digest}.png",
        "audio_fingerprint": digest,
        "source_key": s3_key,
        "wav_temp_path": wav_path,
    }
