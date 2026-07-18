"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { buildInitialValues, splitPayload } from "@/lib/registration";
import {
  errorMessage,
  plantingPrograms,
  plantingProjects,
  trees,
  uploads,
  type ComplianceCheck,
} from "@/lib/api";

export default function NewTreePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const workAreaIdParam = searchParams.get("work_area");

  const { data: enrolledPrograms = [], isLoading } = useQuery({
    queryKey: ["planting-programs", "enrolled"],
    queryFn: () => plantingPrograms.enrolled(),
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
  const [error, setError] = useState<string | null>(null);
  const [compliancePreview, setCompliancePreview] = useState<ComplianceCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const activeProgram = useMemo(
    () => enrolledPrograms.find((program) => program.code === programCode) ?? enrolledPrograms[0],
    [enrolledPrograms, programCode],
  );

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
    setValues((current) => ({
      ...buildInitialValues(activeProgram.form_schema),
      ...current,
    }));
    setPhotoKeys([]);
    setPhotoPreviews([]);
    setError(null);
    setCompliancePreview(null);
  }, [activeProgram?.code]);

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
    if (!projectIdParam || !workAreaId) return;
    try {
      const result = await plantingProjects.complianceCheck(projectIdParam, {
        work_area_id: workAreaId,
        latitude: lat,
        longitude: lon,
        accuracy_m: accuracy,
        species_text: String(values.species_text || ""),
        photo_count: photoKeys.length,
        metadata: {},
      });
      setCompliancePreview(result);
    } catch {
      setCompliancePreview(null);
    }
  }

  async function submit() {
    if (!activeProgram) return;
    setBusy(true);
    setError(null);
    try {
      const payload = splitPayload(activeProgram.form_schema, values, photoKeys, {
        workAreaId: workAreaId ?? undefined,
        projectId: projectIdParam ?? undefined,
      });
      const tree = await trees.create(payload);
      router.push(`/trees/${tree.id}`);
    } catch (err) {
      setError(errorMessage(err));
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

  return (
    <div className="space-y-4">
      {(project || workAreas.length > 0) && (
        <div className="card mx-auto max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Project context
              </p>
              {project ? (
                <p className="font-medium">
                  <Link href={`/projects/${project.id}`} className="text-forest-800 hover:underline">
                    {project.name}
                  </Link>{" "}
                  <span className="text-sm text-stone-500">({project.compliance_mode})</span>
                </p>
              ) : (
                <p className="text-sm text-stone-600">Select a work area for compliant planting.</p>
              )}
            </div>
            {project && (
              <Link href={`/projects/${project.id}`} className="text-sm text-forest-700 hover:underline">
                Open project workspace
              </Link>
            )}
          </div>
          {workAreas.length > 0 && (
            <div>
              <label className="kpi-label">Work area</label>
              <select
                className="input mt-1"
                value={workAreaId ?? ""}
                onChange={(e) => setWorkAreaId(e.target.value || null)}
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
          {requiresWorkArea && !workAreaId && (
            <p className="text-sm text-amber-800">
              This project requires planting inside a defined work area.{" "}
              <Link href={`/projects/${projectIdParam}`} className="underline">
                Draw one on the map
              </Link>{" "}
              first.
            </p>
          )}
          {compliancePreview && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                compliancePreview.passed
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {compliancePreview.passed ? "Location passes compliance checks." : "Compliance notes:"}
              {compliancePreview.chainage_km != null && (
                <span className="ml-2 text-xs">Chainage ~{compliancePreview.chainage_km} km</span>
              )}
              <ul className="mt-1 list-disc pl-4 text-xs">
                {compliancePreview.issues.map((issue, idx) => (
                  <li key={idx}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <RegistrationWizard
        programs={enrolledPrograms}
        programCode={programCode}
        onProgramChange={setProgramCode}
        schema={activeProgram.form_schema}
        values={values}
        onValuesChange={setValues}
        photoKeys={photoKeys}
        photoPreviews={photoPreviews}
        onPhotoKeysChange={setPhotoKeys}
        onPhotoPreviewsChange={setPhotoPreviews}
        onUploadPhoto={(file) => uploads.presignImage(file)}
        onUseLocation={geo}
        locating={locating}
        busy={busy}
        error={error}
        onSubmit={submit}
      />
    </div>
  );
}
