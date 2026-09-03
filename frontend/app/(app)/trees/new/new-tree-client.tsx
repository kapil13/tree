"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { ProjectTreeSchemeContext } from "@/components/trees/project-tree-scheme-context";
import { SchemeProjectRequiredBanner } from "@/components/trees/scheme-project-required-banner";
import { TreeRegistrationSetupGate } from "@/components/trees/tree-registration-setup-gate";
import { buildInitialValues, splitPayload } from "@/lib/registration";
import {
  GOVERNMENT_PROGRAM_CODE,
  applyGovernmentCategoryToValues,
  type GovernmentPlantationCategory,
} from "@/lib/government-plantation-categories";
import {
  centralSchemes,
  errorMessage,
  plantingPrograms,
  plantingProjects,
  trees,
  uploads,
  type ComplianceCheck,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { canWriteInApp } from "@/lib/nav-access";
import { schemeByCode } from "@/lib/schemes";
import {
  applyProjectTreePrefill,
  applySuggestedNextPrefill,
  formatChainageLabel,
  inheritedStandardSummary,
  nextChainageLabelAfter,
} from "@/lib/tree-registration-prefill";
import { enrichTreePayloadMetadata } from "@/lib/tree-registration-defaults";
import { evaluateProjectSetup } from "@/lib/project-setup-readiness";
import { formatTreeRegistrationError } from "@/lib/tree-validation-errors";

const SCHEME_PROGRAM_CODES = new Set(["government_nhai", "ngo_community", "corporate_esg"]);

export function NewTreePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canWrite = canWriteInApp(user);
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const workAreaIdParam = searchParams.get("work_area");
  const chainageKmParam = searchParams.get("chainage_km");
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");

  const { data: enrolledPrograms = [], isLoading } = useQuery({
    queryKey: ["planting-programs", "enrolled"],
    queryFn: () => plantingPrograms.enrolled(),
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
    enabled: !!projectIdParam,
  });

  const { data: project } = useQuery({
    queryKey: ["planting-project", projectIdParam],
    queryFn: () => plantingProjects.get(projectIdParam!),
    enabled: !!projectIdParam,
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectIdParam],
    queryFn: () => plantingProjects.workAreas(projectIdParam!),
    enabled: !!projectIdParam,
  });

  const [programCode, setProgramCode] = useState("byot");
  const [workAreaId, setWorkAreaId] = useState<string | null>(workAreaIdParam);
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [pitPhotoKey, setPitPhotoKey] = useState<string | null>(null);
  const [pitPhotoPreview, setPitPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compliancePreview, setCompliancePreview] = useState<ComplianceCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [wizardResetKey, setWizardResetKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionSavedCount, setSessionSavedCount] = useState(0);

  const { data: registrationContext } = useQuery({
    queryKey: ["registration-context", projectIdParam, workAreaId],
    queryFn: () =>
      plantingProjects.registrationContext(projectIdParam!, workAreaId ?? undefined),
    enabled: !!projectIdParam,
  });

  const activeProgram = useMemo(
    () => enrolledPrograms.find((program) => program.code === programCode) ?? enrolledPrograms[0],
    [enrolledPrograms, programCode],
  );

  const scheme = useMemo(
    () => schemeByCode(schemes, project?.scheme_code),
    [schemes, project?.scheme_code],
  );

  const setupStatus = useMemo(() => {
    if (!project) return null;
    return evaluateProjectSetup({
      project,
      workAreas,
      scheme: scheme as import("@/lib/api").CentralScheme | null | undefined,
    });
  }, [project, workAreas, scheme]);

  const hasSchemePrograms = useMemo(
    () => enrolledPrograms.some((p) => SCHEME_PROGRAM_CODES.has(p.code)),
    [enrolledPrograms],
  );

  const showSchemeProjectWarning = !projectIdParam && hasSchemePrograms;
  const isProjectMode = Boolean(projectIdParam && project);
  const inheritedStandard = useMemo(
    () =>
      inheritedStandardSummary(
        (registrationContext?.inherited_standard
          ? {
              pit_size_cm: registrationContext.inherited_standard.pit_size_cm ?? undefined,
              spacing_m: registrationContext.inherited_standard.spacing_m_min
                ? { min: registrationContext.inherited_standard.spacing_m_min }
                : undefined,
              guard_type_required: registrationContext.inherited_standard.guard_type_required,
            }
          : project?.active_standard?.rules) as Record<string, unknown> | undefined,
      ),
    [registrationContext, project?.active_standard?.rules],
  );
  const requirePitPhoto =
    registrationContext?.inherited_standard.require_pit_photo ??
    Boolean(
      (project?.active_standard?.rules as { require_pit_photo?: boolean } | undefined)
        ?.require_pit_photo,
    );
  const allowedSpecies =
    registrationContext?.inherited_standard.allowed_species ??
    ((project?.active_standard?.rules as { allowed_species?: string[] } | undefined)
      ?.allowed_species ??
      null);
  const chainageEnabled =
    registrationContext?.inherited_standard.chainage_enabled ??
    Boolean(
      (project?.active_standard?.rules as { chainage_enabled?: boolean } | undefined)
        ?.chainage_enabled,
    );
  const spacingMMin =
    registrationContext?.inherited_standard.spacing_m_min ??
    ((project?.active_standard?.rules as { spacing_m?: { min?: number } } | undefined)?.spacing_m
      ?.min ??
      null);
  const registerNextHint = useMemo(() => {
    if (!isProjectMode || !chainageEnabled) return null;
    const nextLabel = nextChainageLabelAfter(values.chainage_km, spacingMMin);
    if (!nextLabel) return null;
    return `After save, register the next tree at KM ${nextLabel}`;
  }, [isProjectMode, chainageEnabled, values.chainage_km, spacingMMin]);

  useEffect(() => {
    if (registrationContext?.suggested_next?.work_area_id && !workAreaIdParam) {
      setWorkAreaId(registrationContext.suggested_next.work_area_id);
    }
  }, [registrationContext?.suggested_next?.work_area_id, workAreaIdParam]);

  useEffect(() => {
    if (!project || !registrationContext?.suggested_next) return;
    const suggested = registrationContext.suggested_next;
    setValues((current) => {
      const next = { ...current };
      if (chainageKmParam) {
        const km = Number(chainageKmParam);
        if (!Number.isNaN(km)) {
          next.chainage_km = formatChainageLabel(km);
        }
      } else if (suggested.chainage_label && !next.chainage_km) {
        next.chainage_km = suggested.chainage_label;
      }
      const lat = latParam ?? (suggested.latitude != null ? String(suggested.latitude) : null);
      const lon = lonParam ?? (suggested.longitude != null ? String(suggested.longitude) : null);
      if (lat && !next.latitude) next.latitude = lat;
      if (lon && !next.longitude) next.longitude = lon;
      return next;
    });
  }, [
    project?.id,
    registrationContext?.suggested_next,
    chainageKmParam,
    latParam,
    lonParam,
  ]);

  useEffect(() => {
    if (project?.program_code) {
      setProgramCode(project.program_code);
    }
  }, [project?.program_code]);

  useEffect(() => {
    if (workAreaIdParam) setWorkAreaId(workAreaIdParam);
  }, [workAreaIdParam]);

  useEffect(() => {
    if (!activeProgram) return;
    const category = project?.metadata?.plantation_category as
      | GovernmentPlantationCategory
      | undefined;
    setValues((current) => {
      let base = {
        ...buildInitialValues(activeProgram.form_schema),
        ...current,
      };
      if (activeProgram.code === GOVERNMENT_PROGRAM_CODE && category && !project?.scheme_code) {
        base = applyGovernmentCategoryToValues(base, category);
      }
      if (project) {
        base = applyProjectTreePrefill(base, project, {
          surveyorName: user?.full_name ?? user?.email,
        });
      }
      return base;
    });
    setError(null);
    setCompliancePreview(null);
  }, [
    activeProgram?.code,
    project?.id,
    project?.scheme_code,
    project?.metadata?.plantation_category,
    project?.metadata?.scheme_refs,
    project?.metadata?.tree_registration_defaults,
    project?.active_standard?.id,
    user?.full_name,
    user?.email,
  ]);

  useEffect(() => {
    setPhotoKeys([]);
    setPhotoPreviews([]);
    setPitPhotoKey(null);
    setPitPhotoPreview(null);
  }, [activeProgram?.code, project?.id]);

  function geo() {
    if (!navigator.geolocation || !activeProgram) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          altitude_m: position.coords.altitude
            ? position.coords.altitude.toFixed(1)
            : current.altitude_m,
          accuracy_m: position.coords.accuracy
            ? position.coords.accuracy.toFixed(1)
            : current.accuracy_m,
        }));
        void runCompliancePreview(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        );
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function runCompliancePreview(lat: number, lon: number, accuracy?: number) {
    if (!projectIdParam || !workAreaId || !activeProgram) return;
    try {
      const draft = splitPayload(activeProgram.form_schema, values, photoKeys, {
        workAreaId: workAreaId ?? undefined,
        projectId: projectIdParam ?? undefined,
      });
      const result = await plantingProjects.complianceCheck(projectIdParam, {
        work_area_id: workAreaId,
        latitude: lat,
        longitude: lon,
        accuracy_m: accuracy,
        species_text: String(values.species_text || ""),
        photo_count: photoKeys.length,
        metadata: draft.metadata ?? {},
      });
      setCompliancePreview(result);
    } catch {
      setCompliancePreview(null);
    }
  }

  async function submit(action: "exit" | "next" = "exit") {
    if (!activeProgram) return;
    if (project && requiresWorkArea && !workAreaId) {
      setError("Select a work area for this project before registering a tree.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const allPhotoKeys = [
        ...(requirePitPhoto && pitPhotoKey ? [pitPhotoKey] : []),
        ...photoKeys,
      ];
      const payload = splitPayload(activeProgram.form_schema, values, allPhotoKeys, {
        workAreaId: workAreaId ?? undefined,
        projectId: projectIdParam ?? undefined,
      });
      if (requirePitPhoto && pitPhotoKey) {
        payload.metadata = {
          ...(payload.metadata ?? {}),
          pit_photo_confirmed: true,
        } as Record<string, unknown>;
      }
      if (project) {
        const meta = { ...(payload.metadata ?? {}) } as Record<string, unknown>;
        const category = values.species_category as string | undefined;
        if (category && category !== "native") {
          meta.species_category = category;
          meta.is_exotic = category === "exotic";
          meta.is_scheduled_species = category === "scheduled";
          if (values.nba_acknowledged) {
            meta.nba_acknowledgment_at = new Date().toISOString();
          }
        }
        payload.metadata = enrichTreePayloadMetadata(meta, project, {
          surveyorName: user?.full_name ?? user?.email,
        });
      }
      const tree = await trees.create(payload);

      if (action === "exit" || !isProjectMode || !projectIdParam) {
        router.push(`/trees/${tree.id}`);
        return;
      }

      setSessionSavedCount((count) => count + 1);
      await queryClient.invalidateQueries({
        queryKey: ["registration-context", projectIdParam, workAreaId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["project-work-areas", projectIdParam],
      });

      const ctx = await plantingProjects.registrationContext(
        projectIdParam,
        workAreaId ?? undefined,
      );
      const suggested = ctx.suggested_next;
      if (!suggested) {
        router.push(`/trees/${tree.id}`);
        return;
      }

      let nextValues: Record<string, string | number | boolean> = {
        ...buildInitialValues(activeProgram.form_schema),
      };
      if (values.species_text) nextValues.species_text = values.species_text;
      if (values.planted_at) nextValues.planted_at = values.planted_at;
      if (values.road_side) nextValues.road_side = values.road_side;
      if (project) {
        nextValues = applyProjectTreePrefill(nextValues, project, {
          surveyorName: user?.full_name ?? user?.email,
        });
      }
      nextValues = applySuggestedNextPrefill(nextValues, suggested);

      setPhotoKeys([]);
      setPhotoPreviews([]);
      setPitPhotoKey(null);
      setPitPhotoPreview(null);
      setCompliancePreview(null);
      setValues(nextValues);
      setWizardResetKey((key) => key + 1);
      setSuccessMessage(
        `Tree saved${tree.public_code ? ` (${tree.public_code})` : ""}. Next gap: ${suggested.chainage_display}.`,
      );
    } catch (err) {
      setError(
        formatTreeRegistrationError(err, {
          projectId: projectIdParam,
          projectMode: isProjectMode,
        }, errorMessage(err)),
      );
    } finally {
      setBusy(false);
    }
  }

  const requiresWorkArea =
    project?.compliance_mode === "strict" || project?.compliance_mode === "guided";

  if (isLoading) {
    return (
      <div className="registration-shell flex min-h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-stone-200 bg-white/80 px-8 py-6 text-center shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
          <p className="text-sm text-stone-600 dark:text-stone-300">Preparing registration studio…</p>
        </div>
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="registration-shell mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 text-center shadow-xl dark:border-stone-800 dark:bg-stone-900/80">
          <h1 className="text-2xl font-semibold">No registration programs enabled</h1>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
            Enable BYOT, Government, Industry, or NGO programs in Settings to unlock the guided
            registration experience.
          </p>
          <Link href="/settings" className="btn-primary mt-6 inline-flex">
            <Settings2 className="h-4 w-4" />
            Open Settings
          </Link>
        </div>
      </div>
    );
  }

  if (showSchemeProjectWarning) {
    return (
      <div className="space-y-4">
        <SchemeProjectRequiredBanner />
      </div>
    );
  }

  if (project && setupStatus && !setupStatus.canRegisterTree) {
    return (
      <div className="space-y-4">
        <ProjectTreeSchemeContext
          project={project}
          scheme={scheme}
          workAreaId={workAreaId}
          workAreaCount={workAreas.length}
          requiresWorkArea={requiresWorkArea}
          compliancePreview={compliancePreview}
        />
        <TreeRegistrationSetupGate project={project} status={setupStatus} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {project && (
        <>
          <ProjectTreeSchemeContext
            project={project}
            scheme={scheme}
            workAreaId={workAreaId}
            workAreaCount={workAreas.length}
            requiresWorkArea={requiresWorkArea}
            compliancePreview={compliancePreview}
          />
          {workAreas.length > 0 && (
            <div className="card mx-auto max-w-3xl">
              <label className="kpi-label">Work area *</label>
              <select
                className="input mt-1"
                value={workAreaId ?? ""}
                onChange={(e) => {
                  setWorkAreaId(e.target.value || null);
                  setCompliancePreview(null);
                }}
              >
                <option value="">Select work area…</option>
                {workAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} ({area.tree_count} trees)
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {project && sessionSavedCount > 0 && (
        <div className="card mx-auto max-w-3xl border-forest-200 bg-forest-50/70 text-sm text-forest-900">
          {sessionSavedCount} tree{sessionSavedCount === 1 ? "" : "s"} registered this session.
          Continue with the next gap below or choose Save & exit when finished.
        </div>
      )}

      <RegistrationWizard
        programs={enrolledPrograms}
        programCode={programCode}
        onProgramChange={setProgramCode}
        lockProgram={!!project}
        skipGovCategory={!!project?.scheme_code}
        mode={isProjectMode ? "project" : "default"}
        requirePitPhoto={requirePitPhoto}
        inheritedStandard={inheritedStandard}
        allowedSpecies={allowedSpecies}
        chainageEnabled={chainageEnabled}
        pitPhotoKey={pitPhotoKey}
        pitPhotoPreview={pitPhotoPreview}
        onPitPhotoChange={(key, preview) => {
          setPitPhotoKey(key);
          setPitPhotoPreview(preview);
        }}
        schema={activeProgram.form_schema}
        values={values}
        onValuesChange={(next) => {
          setValues(next);
          setCompliancePreview(null);
        }}
        photoKeys={photoKeys}
        photoPreviews={photoPreviews}
        onPhotoKeysChange={setPhotoKeys}
        onPhotoPreviewsChange={setPhotoPreviews}
        onUploadPhoto={(file) => uploads.uploadImage(file)}
        onUploadError={(err) => setError(errorMessage(err))}
        onUseLocation={geo}
        locating={locating}
        busy={busy}
        error={error}
        readOnly={!canWrite || (requiresWorkArea && !!project && !workAreaId)}
        uploadDisabled={!canWrite}
        onSubmit={() => submit("exit")}
        onSubmitExit={() => submit("exit")}
        onSubmitNext={() => submit("next")}
        registerNextHint={registerNextHint}
        successMessage={successMessage}
        wizardResetKey={wizardResetKey}
        showNbaFields={
          !!project &&
          (project.compliance_mode === "strict" || !!project.scheme_code)
        }
        cameraOnly={project?.compliance_mode === "strict"}
      />
    </div>
  );
}
