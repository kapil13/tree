# BYOT — Carbon Calculation Engine

This document describes the math and methodology used by
`backend/app/services/carbon/`. The Python implementation is a 1:1
realisation of these formulas. The engine is **stateless and pure** — it
takes inputs and returns a deterministic result, which makes audit and
reproducibility easy.

## 1. Inputs

| Field | Unit | Source |
|---|---|---|
| species | string (Latin or common) | User / AI species detection |
| dbh_cm | cm | Manual / AI growth model |
| height_m | m | Manual / AI / photogrammetry |
| age_years | years | `today − planted_at` |
| climate_zone | enum (tropical, subtropical, temperate, boreal) | lat/lon → zone lookup |
| ecological_zone | enum (rainforest, dry_forest, savanna, plantation, urban) | optional |
| methodology | enum (`IPCC_AR6`, `VERRA_VM0047`, `GOLD_STANDARD_LUF`) | request |
| price_usd_per_credit | USD / tCO₂e | request (default 12.0) |

## 2. Above-Ground Biomass (AGB)

We support three estimators in order of preference:

### 2.1 Species-specific allometric (preferred)

```
AGB_kg = a * (DBH_cm)^b
```

with `a, b` from the `species` table (calibrated from Chave et al. 2014 and
regional studies). Example seeds:

| Species | a | b |
|---|---|---|
| Azadirachta indica (Neem) | 0.0673 | 2.34 |
| Mangifera indica (Mango) | 0.1100 | 2.42 |
| Phyllanthus emblica (Amla) | 0.0530 | 2.30 |
| Ficus religiosa (Peepal) | 0.1240 | 2.41 |
| Ficus benghalensis (Banyan) | 0.1500 | 2.46 |
| Bambusa vulgaris (Bamboo) | 0.0240 | 2.50 |

### 2.2 Pan-tropical (Chave 2014, when DBH + height + WD available)

```
AGB_kg = 0.0673 * (WD_g_cm3 * DBH_cm^2 * H_m)^0.976
```

### 2.3 Generic IPCC fallback (when only DBH known)

```
AGB_kg = exp(-2.289 + 2.649 * ln(DBH_cm) - 0.021 * (ln(DBH_cm))^2)
```

## 3. Below-Ground Biomass (BGB)

```
BGB_kg = R * AGB_kg
```

`R` (root-shoot ratio) from species table; fallback to IPCC AR6 defaults:

| Climate / ecosystem | R |
|---|---|
| Tropical / subtropical moist forest | 0.235 |
| Tropical / subtropical dry forest | 0.275 |
| Temperate forest | 0.260 |
| Boreal forest | 0.320 |
| Plantations (mixed) | 0.250 |

## 4. Total biomass and carbon

```
Total_biomass_kg = AGB + BGB
Carbon_kg        = Total_biomass_kg * CF    # CF default 0.47 (IPCC)
CO2e_kg          = Carbon_kg * 44 / 12       # ≈ 3.6667
```

## 5. Annual sequestration

```
annual_sequestration_kg = (Carbon_kg_now - Carbon_kg_one_year_ago)
                          * (44 / 12)
```

When there is no prior measurement we project the previous year using the
species growth curve and re-apply the allometric.

## 6. Lifetime credits

```
lifetime_credits_tCO2e = Σ (annual_sequestration_kg / 1000)
                          for year in 1..species.max_useful_age
```

## 7. Revenue projection

```
revenue_usd = lifetime_credits_tCO2e * price_usd_per_credit * tier_factor
```

`tier_factor` reflects realistic discounts:

| Tier | Factor |
|---|---|
| Speculative (no verification) | 0.20 |
| AI + satellite verified | 0.55 |
| Verra-listed | 0.90 |
| Verra-issued | 1.00 |

## 8. Methodology mapping

### IPCC AR6
Uses Volume 4, Chapter 4 defaults for biomass expansion and root-shoot.

### Verra VM0047 (Afforestation, Reforestation and Revegetation)
* Eligibility: planted ≥ 2009-12-31, lands non-forest for ≥ 10 years.
* Strata: by species and age cohort.
* Buffer pool: 20 % of credits withheld for permanence risk.
* `lifetime_credits *= (1 - 0.20)` when methodology = `VERRA_VM0047`.

### Gold Standard – Land Use & Forests
* Similar buffer; additional safeguards (biodiversity, community) checks
  via a checklist surfaced in the UI.

## 9. Confidence score

```
confidence = w_species * c_species
           + w_growth  * c_growth
           + w_satellite * c_presence
           + w_data    * data_completeness
```

Default weights: 0.30 / 0.25 / 0.20 / 0.25, normalised to 1.0.

## 10. Versioning

The engine emits `engine_version` (e.g. `byot-carbon-1.0.0`) into every
`carbon_calculations` row, so recomputations remain reproducible and
diff-able. Breaking math changes bump the major version and trigger a
batch recalculation job.
