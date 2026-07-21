"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Home, Plus, Trash2 } from "lucide-react";
import { cmsAdmin, type CmsPage } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";

export function CmsPagesListPanel() {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const { data: pages, isLoading } = useQuery({
    queryKey: ["cms-admin-pages"],
    queryFn: () => cmsAdmin.listPages(),
  });

  const createPage = useMutation({
    mutationFn: (title: string) => cmsAdmin.createPage({ title, published: false }),
    onSuccess: () => {
      setNewTitle("");
      setMessage("Page created.");
      qc.invalidateQueries({ queryKey: ["cms-admin-pages"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const deletePage = useMutation({
    mutationFn: (id: string) => cmsAdmin.deletePage(id),
    onSuccess: () => {
      setMessage("Page deleted.");
      qc.invalidateQueries({ queryKey: ["cms-admin-pages"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function pageUrl(page: CmsPage) {
    if (page.is_home) return "/";
    return `/p/${page.slug}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold">Create page</h2>
        <p className="mt-1 text-sm text-stone-500">
          Add custom marketing pages at <code className="text-xs">/p/your-slug</code>. The homepage is
          managed separately.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Page title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!newTitle.trim() || createPage.isPending}
            onClick={() => createPage.mutate(newTitle.trim())}
          >
            <Plus className="h-4 w-4" />
            Create page
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading pages…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
              <tr>
                <th className="px-4 py-3 font-medium">Page</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(pages ?? []).map((page) => (
                <tr key={page.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      {page.is_home ? <Home className="h-4 w-4 text-forest-700" /> : <FileText className="h-4 w-4" />}
                      {page.title}
                      {page.is_home ? (
                        <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-forest-800">
                          Homepage
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{page.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        page.published
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                          : "rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                      }
                    >
                      {page.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/platform/cms/pages/${page.id}`} className="btn-ghost text-xs">
                        Edit sections
                      </Link>
                      <a
                        href={pageUrl(page)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                      {!page.is_home ? (
                        <button
                          type="button"
                          className="btn-ghost text-xs text-red-600"
                          disabled={deletePage.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete "${page.title}"?`)) {
                              deletePage.mutate(page.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message ? <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p> : null}
    </div>
  );
}
