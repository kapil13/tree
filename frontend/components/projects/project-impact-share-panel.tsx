"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { errorMessage, verification } from "@/lib/api";
import { showToast } from "@/components/toast";

function impactUrlFromToken(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/impact/${token}`;
  }
  return `/impact/${token}`;
}

export function ProjectImpactSharePanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["verification-links", projectId],
    queryFn: () => verification.list({ project_id: projectId }),
  });

  const active = links.find((l) => !l.revoked_at) ?? null;

  const create = useMutation({
    mutationFn: () =>
      verification.create({
        resource_type: "planting_project",
        resource_id: projectId,
        label: "Public impact page",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification-links", projectId] });
      setError(null);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Impact link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  const shareUrl = active ? impactUrlFromToken(active.token) : null;

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" />
        <div>
          <h2 className="text-sm font-medium text-stone-800">Public impact page</h2>
          <p className="mt-1 text-xs text-stone-500">
            Share a read-only snapshot with sponsors or partners. Estimates are labeled — this is not
            carbon credit issuance.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-stone-500">Loading share links…</p>
      ) : shareUrl ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="input flex-1 font-mono text-xs" readOnly value={shareUrl} />
            <button
              type="button"
              className="btn-secondary inline-flex items-center justify-center gap-1.5"
              onClick={() => copyLink(shareUrl)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost inline-flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </div>
          <p className="text-[11px] text-stone-400">
            {active?.view_count ?? 0} views
            {active?.created_at
              ? ` · created ${new Date(active.created_at).toLocaleDateString()}`
              : ""}
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Publish impact page
        </button>
      )}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
