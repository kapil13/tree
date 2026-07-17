"""Generate spectrogram PNG for biodiversity assessment records."""

from __future__ import annotations

import io
import tempfile
from pathlib import Path
from typing import Any

from app.core.logging import get_logger

log = get_logger("bioacoustic.spectrogram")


def generate_spectrogram_png(wav_path: str) -> bytes | None:
    """Render mel-spectrogram PNG bytes from WAV."""
    try:
        import librosa
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        y, sr = librosa.load(wav_path, sr=48000, mono=True, duration=180.0)
        if len(y) < sr // 2:
            return None

        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=12000)
        mel_db = librosa.power_to_db(mel, ref=np.max)

        fig, ax = plt.subplots(figsize=(10, 4), dpi=100)
        img = librosa.display.specshow(
            mel_db, sr=sr, x_axis="time", y_axis="mel", ax=ax, cmap="magma"
        )
        fig.colorbar(img, ax=ax, format="%+2.0f dB", fraction=0.03)
        ax.set_title("Environmental soundscape spectrogram")
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        plt.close(fig)
        return buf.getvalue()
    except Exception as exc:
        log.warning("spectrogram_failed", error=str(exc))
        return None


def upload_spectrogram(storage: Any, key: str, wav_path: str) -> str | None:
    png = generate_spectrogram_png(wav_path)
    if not png:
        return None
    try:
        storage.put_bytes(key, png, content_type="image/png")
        return key
    except Exception as exc:
        log.warning("spectrogram_upload_failed", error=str(exc))
        return None
