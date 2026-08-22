"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TreeRegistrationDefaultsForm } from "@/components/projects/tree-registration-defaults-form";
import { plantingProjects, type PlantingProject } from "@/lib/api";
import { errorMessage } from "@/lib/api";
import {
  treeDefaultsToMetadata,
  treeRegistrationDefaultsFromProject,
  validateTreeRegistrationDefaults,
  type TreeRegistrationDefaults,
} from "@/lib/tree-registration-defaults";

export function ProjectTreeRegistrationDefaultsForm({ project }: { project: PlantingProject }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<TreeRegistrationDefaults>(() =>
    treeRegistrationDefaultsFromProject(project),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValues(treeRegistrationDefaultsFromProject(project));
  }, [project.id, project.metadata, project.scheme_code, project.code, project.name]);

  const save = useMutation({
    mutationFn: () => {
      const validation = validateTreeRegistrationDefaults(values);
      if (Object.keys(validation).length > 0) {
        setFieldErrors(validation);
        throw new Error("Fill all required tree registration defaults.");
      }
      return plantingProjects.update(project.id, {
        metadata: {
          ...project.metadata,
          tree_registration_defaults: treeDefaultsToMetadata(values),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
      setSaved(true);
      setError(null);
      setFieldErrors({});
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (project.program_code !== "government_nhai" && !project.scheme_code) {
    return null;
  }

  return (
    <div className="card space-y-4">
      <TreeRegistrationDefaultsForm
        values={values}
        errors={fieldErrors}
        onChange={(key, value) => {
          setValues((prev) => ({ ...prev, [key]: value }));
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }}
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
          "Save tree registration defaults"
        )}
      </button>
    </div>
  );
}
