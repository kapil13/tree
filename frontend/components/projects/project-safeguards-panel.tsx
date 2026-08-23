"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Shield, Trash2 } from "lucide-react";
import { errorMessage, plantingProjects, uploads, type SafeguardDocument } from "@/lib/api";

const DOC_TYPES = [
  { value: "gram_sabha_resolution", label: "Gram sabha resolution" },
  { value: "fpic_minutes", label: "FPIC / consultation minutes" },
  { value: "patta_cfr_reference", label: "Patta / CFR tenure reference" },
  { value: "stakeholder_consultation_log", label: "Stakeholder engagement log" },
] as const;

export function ProjectSafeguardsPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]["value"]>(
    "gram_sabha_resolution",
  );
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["safeguard-documents", projectId],
    queryFn: () => plantingProjects.listSafeguardDocuments(projectId),
  });

  const remove = useMutation({
    mutationFn: (documentId: string) =>
      plantingProjects.deleteSafeguardDocument(projectId, documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safeguard-documents", projectId] });
      qc.invalidateQueries({ queryKey: ["compliance-workflow", projectId] });
      qc.invalidateQueries({ queryKey: ["project-checklist", projectId] });
    },
  });

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const s3Key = await uploads.uploadImage(file);
      await plantingProjects.createSafeguardDocument(projectId, {
        doc_type: docType,
        title: title.trim() || file.name,
        s3_key: s3Key,
      });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await qc.invalidateQueries({ queryKey: ["safeguard-documents", projectId] });
      await qc.invalidateQueries({ queryKey: ["compliance-workflow", projectId] });
      await qc.invalidateQueries({ queryKey: ["project-checklist", projectId] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
        <Shield className="h-4 w-4 text-forest-700" />
        Safeguards & tenure
      </div>
      <p className="text-xs text-stone-600">
        Upload gram sabha resolutions, FPIC minutes, Patta/CFR references, and stakeholder logs
        required for CAMPA, Nagar Van, Sahakar Van, and MGNREGA audits.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs">Document type</label>
          <select
            className="input text-sm"
            value={docType}
            onChange={(e) =>
              setDocType(e.target.value as (typeof DOC_TYPES)[number]["value"])
            }
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Title (optional)</label>
          <input
            className="input text-sm min-w-[200px]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Gram sabha resolution 2025"
          />
        </div>
        <div>
          <label className="label text-xs">File</label>
          <input
            ref={fileRef}
            type="file"
            className="input text-sm"
            accept="image/*,application/pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}

      {isLoading ? (
        <p className="text-xs text-stone-500">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-stone-500">No safeguard documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {documents.map((doc: SafeguardDocument) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-stone-900">{doc.title}</p>
                <p className="text-xs text-stone-500">{doc.doc_type_label}</p>
              </div>
              <button
                type="button"
                className="btn-secondary text-xs shrink-0"
                disabled={remove.isPending}
                onClick={() => remove.mutate(doc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1 text-[10px] text-stone-400">
        <FileUp className="h-3 w-3" />
        PDF or image uploads use the same secure storage as tree photos.
      </p>
    </div>
  );
}
