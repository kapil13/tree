"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  TreeRegistrationForm,
  buildInitialValues,
  splitPayload,
  type ProgramFormValues,
} from "@/components/tree-registration-form";
import { errorMessage, plantingPrograms, trees, uploads } from "@/lib/api";

export default function NewTreePage() {
  const router = useRouter();
  const { data: enrolledPrograms = [], isLoading } = useQuery({
    queryKey: ["planting-programs", "enrolled"],
    queryFn: () => plantingPrograms.enrolled(),
  });

  const [programCode, setProgramCode] = useState("byot");
  const [values, setValues] = useState<ProgramFormValues>({});
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeProgram = useMemo(
    () => enrolledPrograms.find((program) => program.code === programCode) ?? enrolledPrograms[0],
    [enrolledPrograms, programCode],
  );

  useEffect(() => {
    if (!activeProgram) return;
    setValues((current) => {
      const next = buildInitialValues(activeProgram.form_schema);
      return { ...next, ...current };
    });
    setPhotoKeys([]);
  }, [activeProgram?.code]);

  function geo() {
    if (!navigator.geolocation || !activeProgram) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setValues((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        altitude_m: position.coords.altitude ? position.coords.altitude.toFixed(1) : current.altitude_m,
        accuracy_m: position.coords.accuracy ? position.coords.accuracy.toFixed(1) : current.accuracy_m,
      }));
    });
  }

  const locationLabel =
    values.latitude && values.longitude
      ? `${values.latitude}, ${values.longitude}${
          values.accuracy_m ? ` (±${values.accuracy_m} m)` : ""
        }`
      : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProgram) return;
    setBusy(true);
    setError(null);
    try {
      const payload = splitPayload(activeProgram.form_schema, values, photoKeys);
      const tree = await trees.create(payload);
      router.push(`/trees/${tree.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div>Loading registration programs…</div>;
  if (!activeProgram) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Register a tree</h1>
        <p className="text-sm text-stone-600">
          No registration programs are enabled for your account. Open Settings to opt into BYOT,
          Government, Industry, or NGO programs.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Register a tree</h1>
        <p className="text-sm text-stone-600">
          Choose the registration program that matches your planting context. You can enable more
          programs in Settings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-6">
        <div>
          <label className="label">Registration program</label>
          <select
            className="input"
            value={programCode}
            onChange={(e) => setProgramCode(e.target.value)}
          >
            {enrolledPrograms.map((program) => (
              <option key={program.code} value={program.code}>
                {program.name}
              </option>
            ))}
          </select>
        </div>

        <TreeRegistrationForm
          program={activeProgram.form_schema}
          values={values}
          onChange={setValues}
          photoKeys={photoKeys}
          onPhotoKeysChange={setPhotoKeys}
          onUseLocation={geo}
          locationLabel={locationLabel}
          busy={busy}
          onUploadPhoto={(file) => uploads.presignImage(file)}
        />

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Register tree"}
          </button>
        </div>

        {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <p className="text-xs text-stone-500">
          After registration the platform can run AI photo analysis and queue a baseline satellite
          scan. A unique passport (QR + PDF) is generated automatically.
        </p>
      </form>
    </div>
  );
}
