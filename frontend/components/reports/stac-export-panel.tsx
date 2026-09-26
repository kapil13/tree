"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function StacExportPanel() {
  const [projectId, setProjectId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["ogc-stac-catalog"],
    queryFn: async () => (await api.get("/v1/ogc/stac/catalog")).data as Record<string, unknown>,
    retry: false,
  });

  async function copyUrl(label: string, path: string) {
    const pid = projectId.trim();
    if (!pid && path.includes("{project_id}")) {
      setError("Enter a project ID first.");
      return;
    }
    setError(null);
    const resolved = path.replace("{project_id}", pid);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/api${resolved}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  const catalogSelf =
    typeof catalogQuery.data?.links === "object" &&
    Array.isArray((catalogQuery.data as { links?: Array<{ rel?: string; href?: string }> }).links)
      ? (catalogQuery.data as { links: Array<{ rel?: string; href?: string }> }).links.find(
          (l) => l.rel === "self",
        )?.href
      : null;

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">STAC / OGC export</h2>
        <p className="mt-1 text-sm text-stone-600">
          Copy authenticated API URLs for GIS tools (QGIS STAC plugin, GDAL /vsicurl/, custom ETL).
          Requires a signed-in session or API token with reports access.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="stac-project-id">Project ID</label>
        <input
          id="stac-project-id"
          className="input min-w-[280px]"
          placeholder="UUID of planting project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Organization STAC catalog</span>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1 text-xs"
            onClick={() => void copyUrl("catalog", "/v1/ogc/stac/catalog")}
          >
            <Copy className="h-3 w-3" aria-hidden />
            {copied === "catalog" ? "Copied" : "Copy URL"}
          </button>
          {catalogSelf ? (
            <a href={catalogSelf} className="inline-flex items-center gap-1 text-xs text-forest-700" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" aria-hidden />
              Open
            </a>
          ) : null}
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Project NDVI items</span>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1 text-xs"
            onClick={() =>
              void copyUrl("items", `/v1/ogc/stac/projects/{project_id}/items`)
            }
          >
            <Copy className="h-3 w-3" aria-hidden />
            {copied === "items" ? "Copied" : "Copy URL"}
          </button>
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <span className="font-medium">OGC Features (trees + work areas)</span>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1 text-xs"
            onClick={() =>
              void copyUrl("features", `/v1/ogc/projects/{project_id}/features`)
            }
          >
            <Copy className="h-3 w-3" aria-hidden />
            {copied === "features" ? "Copied" : "Copy URL"}
          </button>
        </li>
      </ul>
      {catalogQuery.isError ? (
        <p className="text-xs text-stone-500">
          Sign in with reports access to preview the live catalog link. URLs above still work with your API token.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
