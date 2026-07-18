"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { buildInitialValues, splitPayload } from "@/lib/registration";
import { errorMessage, plantingPrograms, trees, uploads } from "@/lib/api";

export default function NewTreePage() {
  const router = useRouter();
  const { data: enrolledPrograms = [], isLoading } = useQuery({
    queryKey: ["planting-programs", "enrolled"],
    queryFn: () => plantingPrograms.enrolled(),
  });

  const [programCode, setProgramCode] = useState("byot");
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const activeProgram = useMemo(
    () => enrolledPrograms.find((program) => program.code === programCode) ?? enrolledPrograms[0],
    [enrolledPrograms, programCode],
  );

  useEffect(() => {
    if (!activeProgram) return;
    setValues((current) => ({
      ...buildInitialValues(activeProgram.form_schema),
      ...current,
    }));
    setPhotoKeys([]);
    setPhotoPreviews([]);
    setError(null);
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
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function submit() {
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
  );
}
