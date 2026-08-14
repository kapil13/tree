"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FileDown } from "lucide-react";
import { errorMessage, verificationWorkflow } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

export function ProjectVerificationPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [samplePct, setSamplePct] = useState("10");
  const [lastSampleId, setLastSampleId] = useState<string | null>(null);

  const sample = useQuery({
    queryKey: ["verification-sample", lastSampleId],
    queryFn: () => verificationWorkflow.getSample(lastSampleId!),
    enabled: Boolean(lastSampleId),
  });

  const createSample = useMutation({
    mutationFn: () =>
      verificationWorkflow.createSample(projectId, {
        sample_pct: Number(samplePct),
        method: "random",
      }),
    onSuccess: (data) => {
      setLastSampleId(data.id);
      qc.invalidateQueries({ queryKey: ["verification-sample", data.id] });
    },
  });

  const downloadReport = useMutation({
    mutationFn: (sampleId: string) => verificationWorkflow.downloadReport(sampleId),
    onSuccess: (blob) => downloadBlob(blob, `verification-sample-${lastSampleId}.pdf`),
  });

  const attest = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: "approved" | "rejected" }) =>
      verificationWorkflow.attestItem(lastSampleId!, itemId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verification-sample", lastSampleId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-forest-700" />
        <h3 className="text-sm font-medium text-stone-800">Verifier sample workflow</h3>
      </div>
      <p className="text-xs text-stone-500">
        Supervisors create a random sample; verifiers attest trees without editing measurements (read-only role).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label text-xs">Sample %</label>
          <input
            className="input mt-1 w-24 text-sm"
            type="number"
            min={1}
            max={100}
            value={samplePct}
            onChange={(e) => setSamplePct(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={createSample.isPending}
          onClick={() => createSample.mutate()}
        >
          {createSample.isPending ? "Creating…" : "Create sample"}
        </button>
        {lastSampleId && (
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1 text-xs"
            disabled={downloadReport.isPending}
            onClick={() => downloadReport.mutate(lastSampleId)}
          >
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
        )}
      </div>
      {(createSample.error || attest.error) && (
        <p className="text-xs text-rose-700">{errorMessage(createSample.error ?? attest.error)}</p>
      )}
      {sample.data?.items && sample.data.items.length > 0 && (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 text-sm">
          {sample.data.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="font-mono text-xs">{item.tree_public_code ?? item.tree_id}</span>
              <span className="text-xs capitalize text-stone-600">{item.status}</span>
              {item.status === "pending" && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={attest.isPending}
                    onClick={() => attest.mutate({ itemId: item.id, status: "approved" })}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={attest.isPending}
                    onClick={() => attest.mutate({ itemId: item.id, status: "rejected" })}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
