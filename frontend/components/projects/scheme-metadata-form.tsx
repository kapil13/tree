"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { SchemeRefsFields } from "@/components/projects/scheme-refs-fields";
import { centralSchemes, plantingProjects, type PlantingProject } from "@/lib/api";
import { schemeByCode } from "@/lib/schemes";
import { errorMessage } from "@/lib/api";

type FormField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export function SchemeMetadataForm({ project }: { project: PlantingProject }) {
  const qc = useQueryClient();
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const scheme = schemeByCode(schemes, project.scheme_code);
  const fields = useMemo(() => {
    const section = scheme?.metadata_sections?.[0] as
      | { fields?: FormField[] }
      | undefined;
    return section?.fields ?? [];
  }, [scheme]);

  useEffect(() => {
    const existing =
      (project.metadata?.scheme_refs as Record<string, string> | undefined) ?? {};
    const initial: Record<string, string> = {};
    for (const field of fields) {
      const value = existing[field.key];
      initial[field.key] = value != null ? String(value) : "";
    }
    setRefs(initial);
  }, [project.id, project.metadata, fields]);

  const save = useMutation({
    mutationFn: () =>
      plantingProjects.updateSchemeMetadata(project.id, {
        scheme_refs: Object.fromEntries(
          Object.entries(refs).map(([k, v]) => [k, v.trim() === "" ? null : v]),
        ),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!project.scheme_code || !scheme) {
    return (
      <p className="text-sm text-stone-500">
        No central government scheme is linked to this project. Scheme references are set when you
        pick a scheme at project creation.
      </p>
    );
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No reference fields are configured for {scheme.label}.
      </p>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-sm font-medium">Scheme references</h2>
        <p className="mt-1 text-xs text-stone-500">
          {scheme.label} · {scheme.ministry} — government IDs required for audit and fund
          convergence.
        </p>
      </div>

      <SchemeRefsFields
        fields={fields}
        values={refs}
        onChange={(key, value) => setRefs((prev) => ({ ...prev, [key]: value }))}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="btn-primary"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : saved ? (
          "Saved"
        ) : (
          "Save scheme references"
        )}
      </button>
    </div>
  );
}
