"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TreePine,
} from "lucide-react";
import type { PlantingProgram } from "@/lib/api";
import { countFilledRequired } from "@/lib/registration";
import { cn } from "@/lib/cn";
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
  schema: ProgramFormSchema;
  values: ProgramFormValues;
  onValuesChange: (values: ProgramFormValues) => void;
  photoKeys: string[];
  photoPreviews: string[];
  onPhotoKeysChange: (keys: string[]) => void;
  onPhotoPreviewsChange: (previews: string[]) => void;
  onUploadPhoto: (file: File) => Promise<string>;
  onUseLocation?: () => void;
  locating?: boolean;
  busy?: boolean;
  error?: string | null;
  onSubmit: () => void;
};

function contentSections(schema: ProgramFormSchema) {
  return schema.sections.filter((section) => section.id !== "location");
}

export function RegistrationWizard({
  programs,
  programCode,
  onProgramChange,
  schema,
  values,
  onValuesChange,
  photoKeys,
  photoPreviews,
  onPhotoKeysChange,
  onPhotoPreviewsChange,
  onUploadPhoto,
  onUseLocation,
  locating,
  busy,
  error,
  onSubmit,
}: RegistrationWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const theme = getProgramTheme(programCode);
  const ThemeIcon = theme.icon;

  useEffect(() => {
    setStepIndex(0);
  }, [programCode, schema.code]);

  const steps: WizardStep[] = useMemo(() => {
    const base: WizardStep[] = [];
    if (programs.length > 1) base.push({ id: "program", label: "Program" });
    for (const section of contentSections(schema)) {
      base.push({ id: section.id, label: section.title });
    }
    const location = schema.sections.find((s) => s.id === "location");
    if (location) base.push({ id: "location", label: "Location" });
    base.push({ id: "photos", label: "Evidence" });
    base.push({ id: "review", label: "Review" });
    return base;
  }, [programs.length, schema]);

  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const sectionForStep = useMemo(() => {
    if (!currentStep) return null;
    return contentSections(schema).find((section) => section.id === currentStep.id) ?? null;
  }, [currentStep, schema]);

  async function addPhotos(files: FileList) {
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
    if (currentStep.id === "photos") return photoKeys.length >= schema.min_photos;
    if (currentStep.id === "review") return true;
    if (currentStep.id === "program") return Boolean(programCode);
    if (currentStep.id === "location") {
      return Boolean(values.latitude && values.longitude);
    }
    if (sectionForStep) {
      return countFilledRequired(sectionForStep.fields, values).complete;
    }
    return true;
  }

  function goNext() {
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
                Register with confidence
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300 md:text-base">
                A guided, compliance-ready flow that adapts to your planting program — from citizen
                BYOT tagging to government and ESG evidence capture.
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
        <StepHeader step={currentStep} section={sectionForStep} schema={schema} />

        <div className="mt-8">
          {currentStep?.id === "program" && (
            <ProgramSelector programs={programs} value={programCode} onChange={onProgramChange} />
          )}

          {sectionForStep && currentStep?.id !== "location" && (
            <FormFieldsGrid
              fields={sectionForStep.fields}
              values={values}
              onChange={onValuesChange}
            />
          )}

          {currentStep?.id === "location" && (
            <LocationPanel
              fields={schema.sections.find((s) => s.id === "location")?.fields ?? []}
              values={values}
              onChange={onValuesChange}
              onUseLocation={onUseLocation}
              locating={locating}
            />
          )}

          {currentStep?.id === "photos" && (
            <PhotoUploadZone
              minPhotos={schema.min_photos}
              photoKeys={photoKeys}
              previews={photoPreviews}
              busy={busy || uploading}
              onAdd={addPhotos}
              onRemove={removePhoto}
            />
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
              disabled={!canContinue() || busy || uploading}
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

function StepHeader({
  step,
  section,
  schema,
}: {
  step?: WizardStep;
  section: ProgramSection | null;
  schema: ProgramFormSchema;
}) {
  if (!step) return null;

  const title =
    step.id === "program"
      ? "Choose your registration path"
      : step.id === "photos"
        ? "Attach field evidence"
        : step.id === "review"
          ? "Review before submission"
          : step.id === "location"
            ? "Capture precise coordinates"
            : section?.title ?? step.label;

  const description =
    step.id === "program"
      ? "Pick the form that matches your planting context. You can enable more programs anytime in Settings."
      : step.id === "photos"
        ? `Upload at least ${schema.min_photos} clear images for verification and AI health analysis.`
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
