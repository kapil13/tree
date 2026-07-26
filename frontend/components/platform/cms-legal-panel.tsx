"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Scale } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cmsAdmin, type LegalDocument } from "@/lib/cms-api";
import { cn } from "@/lib/cn";

export function CmsLegalPanel() {
  const qc = useQueryClient();
  const { data: docs = [], isLoading, error } = useQuery({
    queryKey: ["cms-legal"],
    queryFn: () => cmsAdmin.listLegal(),
  });
  const [selectedSlug, setSelectedSlug] = useState<string>("terms");
  const [draft, setDraft] = useState<LegalDocument | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!docs.length) return;
    const current = docs.find((d) => d.slug === selectedSlug) ?? docs[0];
    setSelectedSlug(current.slug);
    setDraft(current);
  }, [docs, selectedSlug]);

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("no_draft");
      return cmsAdmin.updateLegal(draft.slug, {
        title: draft.title,
        meta_description: draft.meta_description,
        body: draft.body,
        published: draft.published,
      });
    },
    onSuccess: (updated) => {
      setDraft(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["cms-legal"] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading legal documents…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {errorMessage(error)}
      </div>
    );
  }

  if (!draft) {
    return <p className="text-sm text-stone-500">No legal documents found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-sm text-forest-900">
        <div className="flex items-start gap-2">
          <Scale className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Edit Terms, Privacy, and Data Use policies shown on the public site and linked from
            signup. Have counsel review templates before go-live. Changes publish immediately when
            the document is marked published.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {docs.map((doc) => (
          <button
            key={doc.slug}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              doc.slug === draft.slug
                ? "bg-forest-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200",
            )}
            onClick={() => setSelectedSlug(doc.slug)}
          >
            {doc.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="card space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Meta description</label>
            <input
              className="input"
              value={draft.meta_description}
              onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Document body</label>
            <p className="mb-1 text-xs text-stone-500">
              Plain text with Markdown-style headings (`#`, `##`). Shown at{" "}
              <code className="rounded bg-stone-100 px-1">{draft.public_path}</code>
            </p>
            <textarea
              className="input min-h-[420px] font-mono text-xs leading-relaxed"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              Published
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save {draft.title}
            </button>
            {saved ? <span className="text-xs text-emerald-700">Saved</span> : null}
            {save.error ? (
              <span className="text-xs text-rose-700">{errorMessage(save.error)}</span>
            ) : null}
          </div>
        </div>

        <aside className="card space-y-3 text-sm">
          <p className="font-medium text-stone-900">Public URLs</p>
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={doc.public_path}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-forest-700 hover:underline"
                >
                  {doc.public_path}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <p className="text-xs text-stone-500">{doc.title}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-500">
            Also linked from signup acceptance and the site footer Legal column.
          </p>
          {draft.updated_at ? (
            <p className="text-xs text-stone-400">
              Last saved {new Date(draft.updated_at).toLocaleString()}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
