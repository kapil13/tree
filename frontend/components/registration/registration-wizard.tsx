"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  TreePine,
} from "lucide-react";
import type { PlantingProgram } from "@/lib/api";
import { countFilledRequired } from "@/lib/registration";
import { viewerReadOnlyMessage } from "@/lib/nav-access";
import { cn } from "@/lib/cn";
import type { InheritedStandardPrefill } from "@/lib/tree-registration-prefill";
import { uniqueSpeciesChips } from "@/lib/tree-registration-prefill";
import { PlantationCategorySelector } from "@/components/government/plantation-category-selector";
import {
  GOVERNMENT_PROGRAM_CODE,
  applyGovernmentCategoryToValues,
  inferGovernmentCategory,
  shouldShowHighwaySection,
  type GovernmentPlantationCategory,
} from "@/lib/government-plantation-categories";
import { FormFieldsGrid } from "./form-fields";
import { LocationPanel } from "./location-panel";
import { PhotoUploadZone } from "./photo-upload-zone";
import { ProgramSelector } from "./program-selector";
import { getProgramTheme } from "./program-theme";
import { StepIndicator, type WizardStep } from "./step-indicator";
import type { ProgramFormSchema, ProgramFormValues, ProgramSection } from "./types";

type RegistrationWizardProps = {
  programs: PlantingProgram[];
  programCode: string;
  onProgramChange: (code: string) => void;
  lockProgram?: boolean;
  skipGovCategory?: boolean;
  mode?: "default" | "project";
  requirePitPhoto?: boolean;
  inheritedStandard?: InheritedStandardPrefill;
  allowedSpecies?: string[] | null;
  chainageEnabled?: boolean;
  pitPhotoKey?: string | null;
  pitPhotoPreview?: string | null;
  onPitPhotoChange?: (key: string | null, preview: string | null) => void;
  schema: ProgramFormSchema;
  values: ProgramFormValues;
  onValuesChange: (values: ProgramFormValues) => void;
  photoKeys: string[];
  photoPreviews: string[];
  onPhotoKeysChange: (keys: string[]) => void;
  onPhotoPreviewsChange: (previews: string[]) => void;
  onUploadPhoto: (file: File) => Promise<string>;
  onUploadError?: (error: unknown) => void;
  onUseLocation?: () => void;
  locating?: boolean;
  busy?: boolean;
  error?: string | null;
  readOnly?: boolean;
  uploadDisabled?: boolean;
  onSubmit: () => void;
};

function contentSections(
  schema: ProgramFormSchema,
  options?: { programCode?: string; govCategory?: GovernmentPlantationCategory | null },
) {
  return schema.sections.filter((section) => {
    if (section.id === "location") return false;
    if (
      options?.programCode === GOVERNMENT_PROGRAM_CODE &&
      section.id === "highway" &&
      !shouldShowHighwaySection(options.govCategory)
    ) {
      return false;
    }
    return true;
  });
}

export function RegistrationWizard({
  programs,
  programCode,
  onProgramChange,
  lockProgram = false,
  skipGovCategory = false,
  mode = "default",
  requirePitPhoto = false,
  inheritedStandard,
  allowedSpecies,
  chainageEnabled = false,
  pitPhotoKey = null,
  pitPhotoPreview = null,
  onPitPhotoChange,
  schema,
  values,
  onValuesChange,
  photoKeys,
  photoPreviews,
  onPhotoKeysChange,
  onPhotoPreviewsChange,
  onUploadPhoto,
  onUploadError,
  onUseLocation,
  locating,
  busy,
  error,
  readOnly = false,
  uploadDisabled,
  onSubmit,
}: RegistrationWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [govCategory, setGovCategory] = useState<GovernmentPlantationCategory | null>(() =>
    programCode === GOVERNMENT_PROGRAM_CODE ? inferGovernmentCategory(values) : null,
  );
  const theme = getProgramTheme(programCode);
  const ThemeIcon = theme.icon;
  const photosLocked = uploadDisabled ?? readOnly;

  useEffect(() => {
    setStepIndex(0);
  }, [programCode, schema.code, mode, requirePitPhoto]);

  const plantingSection = useMemo(
    () => schema.sections.find((section) => section.id === "planting") ?? null,
    [schema.sections],
  );
  const highwaySection = useMemo(
    () => schema.sections.find((section) => section.id === "highway") ?? null,
    [schema.sections],
  );
  const roadSideField = useMemo(
    () => highwaySection?.fields.find((field) => field.key === "road_side") ?? null,
    [highwaySection],
  );

  const minPlantPhotos = useMemo(() => {
    if (mode !== "project") return schema.min_photos;
    if (requirePitPhoto) return Math.max(1, schema.min_photos - 1);
    return schema.min_photos;
  }, [mode, schema.min_photos, requirePitPhoto]);

  const totalPhotoCount =
    photoKeys.length + (requirePitPhoto && pitPhotoKey ? 1 : 0);

  useEffect(() => {
    if (programCode !== GOVERNMENT_PROGRAM_CODE) {
      setGovCategory(null);
      return;
    }
    const inferred = inferGovernmentCategory(values);
    if (inferred) setGovCategory(inferred);
  }, [programCode, values.legal_basis, values.land_category]);

  const t = useTranslations("trees");

  const steps: WizardStep[] = useMemo(() => {
    if (mode === "project") {
      const projectSteps: WizardStep[] = [
        { id: "location", label: t("wizardLocation") },
      ];
      if (requirePitPhoto) {
        projectSteps.push({ id: "pit_photo", label: "Pit photo" });
      }
      projectSteps.push({ id: "photos", label: t("wizardPhotos") });
      projectSteps.push({ id: "species_review", label: "Species & review" });
      return projectSteps;
    }

    const base: WizardStep[] = [];
    if (programs.length > 1 && !lockProgram) base.push({ id: "program", label: t("wizardProgram") });
    if (programCode === GOVERNMENT_PROGRAM_CODE && !skipGovCategory) {
      base.push({ id: "gov_category", label: t("wizardProgram") });
    }
    for (const section of contentSections(schema, { programCode, govCategory })) {
      base.push({ id: section.id, label: section.title });
    }
    const location = schema.sections.find((s) => s.id === "location");
    if (location) base.push({ id: "location", label: t("wizardLocation") });
    base.push({ id: "photos", label: t("wizardPhotos") });
    base.push({ id: "review", label: t("wizardReview") });
    return base;
  }, [
    mode,
    requirePitPhoto,
    programs.length,
    schema,
    programCode,
    govCategory,
    lockProgram,
    skipGovCategory,
    t,
  ]);

  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const sectionForStep = useMemo(() => {
    if (!currentStep) return null;
    return (
      contentSections(schema, { programCode, govCategory }).find(
        (section) => section.id === currentStep.id,
      ) ?? null
    );
  }, [currentStep, schema, programCode, govCategory]);

  async function addPitPhoto(files: FileList) {
    if (photosLocked || !onPitPhotoChange) return;
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const key = await onUploadPhoto(file);
      onPitPhotoChange(key, URL.createObjectURL(file));
    } catch (err) {
      onUploadError?.(err);
    } finally {
      setUploading(false);
    }
  }

  async function addPhotos(files: FileList) {
    if (photosLocked) return;
    setUploading(true);
    try {
      const nextKeys = [...photoKeys];
      const nextPreviews = [...photoPreviews];
      for (const file of Array.from(files)) {
        const key = await onUploadPhoto(file);
        nextKeys.push(key);
        nextPreviews.push(URL.createObjectURL(file));
      }
      onPhotoKeysChange(nextKeys);
      onPhotoPreviewsChange(nextPreviews);
    } catch (err) {
      onUploadError?.(err);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    onPhotoKeysChange(photoKeys.filter((_, i) => i !== index));
    onPhotoPreviewsChange(photoPreviews.filter((_, i) => i !== index));
  }

  function canContinue() {
    if (!currentStep) return false;
    if (currentStep.id === "pit_photo") return Boolean(pitPhotoKey);
    if (currentStep.id === "photos") {
      if (mode === "project") {
        return photoKeys.length >= minPlantPhotos;
      }
      return photoKeys.length >= schema.min_photos;
    }
    if (currentStep.id === "species_review") {
      const hasSpecies = Boolean(values.species_text && values.planted_at);
      if (chainageEnabled && roadSideField) {
        return hasSpecies && Boolean(values.road_side);
      }
      return hasSpecies;
    }
    if (currentStep.id === "review") return true;
    if (currentStep.id === "program") return Boolean(programCode);
    if (currentStep.id === "gov_category") return Boolean(govCategory);
    if (currentStep.id === "location") {
      return Boolean(values.latitude && values.longitude);
    }
    if (sectionForStep) {
      return countFilledRequired(sectionForStep.fields, values).complete;
    }
    return true;
  }

  function goNext() {
    if (readOnly) return;
    if (isLast) {
      onSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="registration-shell mx-auto max-w-6xl">
      <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_20px_80px_-20px_rgba(16,185,129,0.25)] backdrop-blur-xl dark:border-stone-800/80 dark:bg-stone-900/60 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white dark:bg-stone-100 dark:text-stone-900">
              <TreePine className="h-3.5 w-3.5" />
              Tree passport registration
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 md:text-4xl">
                {mode === "project" ? "Register project tree" : "Register with confidence"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300 md:text-base">
                {mode === "project"
                  ? "GPS, photos, and species only — pit size, spacing, and guard inherit from the programme standard."
                  : "A guided, compliance-ready flow that adapts to your planting program — from citizen BYOT tagging to government and ESG evidence capture."}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-4 text-white shadow-xl",
              theme.gradient,
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ThemeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Active program</p>
              <p className="font-semibold">{schema.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <StepIndicator steps={steps} currentIndex={stepIndex} />
      </div>

      <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-6 shadow-xl shadow-stone-900/5 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/75 md:p-8">
        {readOnly && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            {viewerReadOnlyMessage("trees")}
          </div>
        )}

        {mode === "project" && inheritedStandard && (
          <InheritedStandardBanner inherited={inheritedStandard} />
        )}

        <StepHeader
          step={currentStep}
          section={sectionForStep}
          schema={schema}
          mode={mode}
          minPlantPhotos={minPlantPhotos}
        />

        <div className="mt-8">
          {currentStep?.id === "program" && (
            <ProgramSelector programs={programs} value={programCode} onChange={onProgramChange} />
          )}

          {currentStep?.id === "gov_category" && (
            <PlantationCategorySelector
              value={govCategory}
              disabled={readOnly}
              onChange={(category) => {
                setGovCategory(category);
                onValuesChange(applyGovernmentCategoryToValues(values, category));
              }}
            />
          )}

          {sectionForStep && currentStep?.id !== "location" && (
            <FormFieldsGrid
              fields={sectionForStep.fields}
              values={values}
              onChange={onValuesChange}
              disabled={readOnly}
            />
          )}

          {currentStep?.id === "location" && (
            <LocationPanel
              fields={schema.sections.find((s) => s.id === "location")?.fields ?? []}
              values={values}
              onChange={onValuesChange}
              onUseLocation={readOnly ? undefined : onUseLocation}
              locating={locating}
              disabled={readOnly}
            />
          )}

          {currentStep?.id === "pit_photo" && (
            <PhotoUploadZone
              minPhotos={1}
              photoKeys={pitPhotoKey ? [pitPhotoKey] : []}
              previews={pitPhotoPreview ? [pitPhotoPreview] : []}
              busy={busy || uploading}
              onAdd={addPitPhoto}
              onRemove={() => onPitPhotoChange?.(null, null)}
              disabled={photosLocked}
            />
          )}

          {currentStep?.id === "photos" && (
            <PhotoUploadZone
              minPhotos={mode === "project" ? minPlantPhotos : schema.min_photos}
              photoKeys={photoKeys}
              previews={photoPreviews}
              busy={busy || uploading}
              onAdd={addPhotos}
              onRemove={removePhoto}
              disabled={photosLocked}
            />
          )}

          {currentStep?.id === "species_review" && plantingSection && (
            <>
              <FormFieldsGrid
                fields={plantingSection.fields.filter((field) =>
                  ["species_text", "planted_at"].includes(field.key),
                )}
                values={values}
                onChange={onValuesChange}
                disabled={readOnly}
              />
              {chainageEnabled && roadSideField ? (
                <div className="mt-4">
                  <FormFieldsGrid
                    fields={[roadSideField]}
                    values={values}
                    onChange={onValuesChange}
                    disabled={readOnly}
                  />
                </div>
              ) : null}
              {allowedSpecies?.length ? (
                <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Approved species for this project
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {uniqueSpeciesChips(allowedSpecies).map((name) => (
                      <button
                        key={name}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onValuesChange({ ...values, species_text: name })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition",
                          values.species_text === name
                            ? "border-forest-600 bg-forest-50 text-forest-800 dark:border-forest-700 dark:bg-forest-950/50 dark:text-forest-200"
                            : "border-stone-200 bg-white text-stone-700 hover:border-forest-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200",
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-8">
                <ProjectReviewPanel
                  schema={schema}
                  values={values}
                  photoCount={totalPhotoCount}
                  programCode={programCode}
                  inheritedStandard={inheritedStandard}
                />
              </div>
            </>
          )}

          {currentStep?.id === "review" && (
            <ReviewPanel
              schema={schema}
              values={values}
              photoCount={photoKeys.length}
              programCode={programCode}
            />
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-stone-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
          <button
            type="button"
            onClick={goBack}
            disabled={isFirst || busy}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-xs text-stone-500">
              Step {stepIndex + 1} of {steps.length}
              {!canContinue() ? " · Complete required fields to continue" : ""}
            </p>
            <button
              type="button"
              onClick={goNext}
              disabled={readOnly || !canContinue() || busy || uploading}
              className="btn-primary min-w-[180px]"
            >
              {isLast ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  {busy ? "Registering…" : "Create tree passport"}
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InheritedStandardBanner({ inherited }: { inherited: InheritedStandardPrefill }) {
  return (
    <div className="mb-6 rounded-2xl border border-forest-200 bg-forest-50/80 px-4 py-3 dark:border-forest-900 dark:bg-forest-950/30">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-forest-800">
        <ShieldCheck className="h-4 w-4" />
        Inherited from programme standard
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-sm text-stone-700">
        {inherited.pit_size_label && <li>Pit {inherited.pit_size_label} cm</li>}
        {inherited.spacing_m_min != null && <li>Spacing {inherited.spacing_m_min} m</li>}
        {inherited.guard_type_required && <li>Tree guard required</li>}
      </ul>
      <p className="mt-2 text-xs text-stone-500">These fields are set once on the project — not re-entered per tree.</p>
    </div>
  );
}

function StepHeader({
  step,
  section,
  schema,
  mode = "default",
  minPlantPhotos,
}: {
  step?: WizardStep;
  section: ProgramSection | null;
  schema: ProgramFormSchema;
  mode?: "default" | "project";
  minPlantPhotos?: number;
}) {
  if (!step) return null;

  const title =
    step.id === "program"
      ? "Choose your registration path"
      : step.id === "gov_category"
        ? "What type of government planting is this?"
        : step.id === "photos"
        ? "Attach field evidence"
        : step.id === "pit_photo"
          ? "Photograph the pit"
        : step.id === "species_review"
          ? "Species & review"
        : step.id === "review"
          ? "Review before submission"
          : step.id === "location"
            ? "Capture precise coordinates"
            : section?.title ?? step.label;

  const description =
    step.id === "program"
      ? "Pick the form that matches your planting context. You can enable more programs anytime in Settings."
      : step.id === "gov_category"
        ? "Choose the scheme that best matches your work. Legal basis and land category will be pre-filled — you can adjust them in the next step if needed."
        : step.id === "photos"
        ? mode === "project"
          ? `Upload at least ${minPlantPhotos ?? schema.min_photos} plant/tree photos (pit photo is separate).`
          : `Upload at least ${schema.min_photos} clear images for verification and AI health analysis.`
        : step.id === "pit_photo"
          ? "Photograph the prepared pit before planting. This is required for highway and strict compliance programmes."
        : step.id === "species_review"
          ? "Confirm species and planting date. Pit size, spacing, and guard inherit from the programme."
        : step.id === "review"
          ? "Confirm the details below. A QR passport and satellite baseline scan will be generated automatically."
          : section?.description ??
            (step.id === "location"
              ? "Accurate GPS is essential for map placement, audits, and satellite monitoring."
              : undefined);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-forest-700 dark:text-forest-400">
        {step.label}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
        {title}
      </h2>
      {description && (
        <p className="max-w-3xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          {description}
        </p>
      )}
    </div>
  );
}

function ProjectReviewPanel({
  schema,
  values,
  photoCount,
  programCode,
  inheritedStandard,
}: {
  schema: ProgramFormSchema;
  values: ProgramFormValues;
  photoCount: number;
  programCode: string;
  inheritedStandard?: InheritedStandardPrefill;
}) {
  const rows: { label: string; value: string }[] = [];
  if (values.latitude && values.longitude) {
    rows.push({
      label: "GPS",
      value: `${values.latitude}, ${values.longitude}`,
    });
  }
  if (values.chainage_km) {
    rows.push({ label: "Chainage", value: String(values.chainage_km) });
  }
  if (inheritedStandard?.pit_size_label) {
    rows.push({ label: "Pit (inherited)", value: `${inheritedStandard.pit_size_label} cm` });
  }
  if (inheritedStandard?.spacing_m_min != null) {
    rows.push({ label: "Spacing (inherited)", value: `${inheritedStandard.spacing_m_min} m` });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-stone-200 bg-stone-50/80 p-5 dark:border-stone-800 dark:bg-stone-950/40">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
          Submission summary
        </h3>
        <dl className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 border-b border-stone-200/80 pb-3 last:border-0 dark:border-stone-800"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-3xl border border-forest-200 bg-gradient-to-br from-forest-50 to-white p-5 dark:border-forest-900 dark:from-forest-950/40 dark:to-stone-900">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-forest-600" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-stone-900 dark:text-stone-50">Ready to register</p>
            <p className="leading-relaxed text-stone-600 dark:text-stone-300">
              {schema.name} · {photoCount} photos · QR passport on save.
            </p>
            <p className="font-mono text-xs text-stone-500">{programCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({
  schema,
  values,
  photoCount,
  programCode,
}: {
  schema: ProgramFormSchema;
  values: ProgramFormValues;
  photoCount: number;
  programCode: string;
}) {
  const rows: { label: string; value: string }[] = [];

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const raw = values[field.key];
      if (raw === "" || raw === undefined || raw === null) continue;
      rows.push({
        label: field.label,
        value: typeof raw === "boolean" ? (raw ? "Yes" : "No") : String(raw),
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-stone-200 bg-stone-50/80 p-5 dark:border-stone-800 dark:bg-stone-950/40">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
          Submission summary
        </h3>
        <dl className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 border-b border-stone-200/80 pb-3 last:border-0 dark:border-stone-800"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-forest-200 bg-gradient-to-br from-forest-50 to-white p-5 dark:border-forest-900 dark:from-forest-950/40 dark:to-stone-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-forest-600" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-stone-900 dark:text-stone-50">Ready to register</p>
              <p className="leading-relaxed text-stone-600 dark:text-stone-300">
                Program <span className="font-medium">{schema.name}</span> · {photoCount} photos
                attached · passport QR generated on save.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900">
          Registration code: <span className="font-mono text-stone-700 dark:text-stone-300">{programCode}</span>
        </div>
      </div>
    </div>
  );
}
