"""Tests for Perch multi-taxa label parsing and coverage."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np

from app.services.bioacoustic.identification_coverage import identification_coverage
from app.services.bioacoustic.perch_labels import (
    is_probable_species_label,
    scientific_name_from_label,
)
from app.services.bioacoustic.perch_runner import run_perch
from app.services.bioacoustic.taxon_groups import (
    detection_taxon_group,
    normalize_taxon_group,
    parse_taxa_csv,
)


def test_is_probable_species_label_filters_noise():
    assert is_probable_species_label("Acheta domesticus") is True
    assert is_probable_species_label("Accordion") is False
    assert is_probable_species_label("Accelerating_and_revving_and_vroom") is False
    assert is_probable_species_label("inat2024_fsd50k") is False


def test_scientific_name_from_label():
    assert scientific_name_from_label("Magicicada septendecim") == "Magicicada septendecim"
    assert scientific_name_from_label("Accordion") is None


def test_taxon_group_normalization():
    assert normalize_taxon_group("frog") == "amphibian"
    assert detection_taxon_group("amphibian") == "frog"
    assert parse_taxa_csv("amphibian,mammal,bird") == {"amphibian", "mammal", "bird"}


def test_identification_coverage_birdnet_only():
    with (
        patch("app.services.bioacoustic.identification_coverage.perch_available", return_value=False),
        patch("app.services.bioacoustic.identification_coverage.settings") as mock_settings,
    ):
        mock_settings.bioacoustic_enable_perch = False
        mock_settings.bioacoustic_enable_frogs = False
        mock_settings.bioacoustic_enable_insects = False
        mock_settings.bioacoustic_perch_taxa = "amphibian,mammal,insect,reptile"
        cov = identification_coverage()
    assert cov["bird"] == "birdnet"
    assert cov["mammal"] == "pending_model"


def test_identification_coverage_with_perch():
    with (
        patch("app.services.bioacoustic.identification_coverage.perch_available", return_value=True),
        patch("app.services.bioacoustic.identification_coverage.settings") as mock_settings,
    ):
        mock_settings.bioacoustic_enable_perch = True
        mock_settings.bioacoustic_enable_frogs = False
        mock_settings.bioacoustic_enable_insects = False
        mock_settings.bioacoustic_perch_taxa = "amphibian,mammal,insect,reptile"
        cov = identification_coverage()
    assert cov["mammal"] == "perch-v2"
    assert cov["amphibian"] == "perch-v2"
    assert cov["reptile"] == "perch-v2"


@patch("app.services.bioacoustic.perch_runner._session")
@patch("app.services.bioacoustic.perch_runner._labels")
@patch("app.services.bioacoustic.perch_runner._load_audio_windows")
@patch("app.services.bioacoustic.perch_runner.settings")
def test_run_perch_aggregates_windows(
    mock_settings,
    mock_windows,
    mock_labels,
    mock_session,
):
    mock_settings.bioacoustic_enable_perch = True
    mock_settings.bioacoustic_perch_min_confidence = 0.1
    mock_settings.bioacoustic_perch_top_k = 5
    mock_settings.bioacoustic_perch_taxa = "insect"
    mock_settings.bioacoustic_perch_hop_samples = 80_000

    mock_labels.return_value = ("inat_meta", "Acheta domesticus", "Accordion")
    mock_windows.return_value = [(0.0, np.zeros(160_000, dtype=np.float32))]

    logits = np.array([-10.0, 5.0, -5.0], dtype=np.float32)
    session = MagicMock()
    session.get_inputs.return_value = [MagicMock(name="inputs")]
    session.get_outputs.return_value = [MagicMock(name="label")]
    session.run.return_value = [logits.reshape(1, -1)]
    mock_session.return_value = session

    with patch(
        "app.services.bioacoustic.perch_runner.taxon_group_for_label",
        return_value="insect",
    ):
        detections = run_perch("/tmp/fake.wav", duration_seconds=60.0, exclude_birds=True)

    assert len(detections) == 1
    assert detections[0].scientific_name == "Acheta domesticus"
    assert detections[0].taxon_group == "insect"
    assert detections[0].call_count == 1
