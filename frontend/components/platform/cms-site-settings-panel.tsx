"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, LayoutTemplate } from "lucide-react";
import { CmsLinkListEditor } from "@/components/platform/cms-link-list-editor";
import { cmsAdmin, type CmsLink, type CmsPublicSite } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";

type HeaderConfig = CmsPublicSite["site"]["header"];
type FooterConfig = CmsPublicSite["site"]["footer"];

export function CmsSiteSettingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cms-admin-site"],
    queryFn: () => cmsAdmin.siteConfig(),
  });

  const [header, setHeader] = useState<HeaderConfig | null>(null);
  const [footer, setFooter] = useState<FooterConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"header" | "footer">("header");

  useEffect(() => {
    if (data) {
      setHeader(data.header);
      setFooter(data.footer);
    }
  }, [data]);

  const saveHeader = useMutation({
    mutationFn: () => cmsAdmin.updateSiteConfig("header", header as unknown as Record<string, unknown>),
    onSuccess: () => {
      setMessage("Header saved.");
      qc.invalidateQueries({ queryKey: ["cms-admin-site"] });
      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const saveFooter = useMutation({
    mutationFn: () => cmsAdmin.updateSiteConfig("footer", footer as unknown as Record<string, unknown>),
    onSuccess: () => {
      setMessage("Footer saved.");
      qc.invalidateQueries({ queryKey: ["cms-admin-site"] });
      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (isLoading || !header || !footer) {
    return <p className="text-sm text-stone-500">Loading site settings…</p>;
  }

  function updateFooterColumn(index: number, field: "title", value: string) {
    setFooter((current) => {
      if (!current) return current;
      const columns = current.columns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col,
      );
      return { ...current, columns };
    });
  }

  function updateFooterColumnLinks(index: number, links: CmsLink[]) {
    setFooter((current) => {
      if (!current) return current;
      const columns = current.columns.map((col, i) => (i === index ? { ...col, links } : col));
      return { ...current, columns };
    });
  }

  function addFooterColumn() {
    setFooter((current) => {
      if (!current) return current;
      return {
        ...current,
        columns: [...current.columns, { title: "New column", links: [{ label: "Link", href: "/" }] }],
      };
    });
  }

  function removeFooterColumn(index: number) {
    setFooter((current) => {
      if (!current) return current;
      return { ...current, columns: current.columns.filter((_, i) => i !== index) };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          className={tab === "header" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("header")}
        >
          <LayoutTemplate className="h-4 w-4" />
          Header
        </button>
        <button
          type="button"
          className={tab === "footer" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("footer")}
        >
          <Globe className="h-4 w-4" />
          Footer
        </button>
      </div>

      {tab === "header" ? (
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <CmsLinkListEditor
            label="Navigation links"
            links={header.nav}
            onChange={(nav) => setHeader({ ...header, nav })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Sign in label</label>
              <input
                className="input w-full"
                value={header.sign_in.label}
                onChange={(e) =>
                  setHeader({ ...header, sign_in: { ...header.sign_in, label: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sign in URL</label>
              <input
                className="input w-full"
                value={header.sign_in.href}
                onChange={(e) =>
                  setHeader({ ...header, sign_in: { ...header.sign_in, href: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Get started label</label>
              <input
                className="input w-full"
                value={header.get_started.label}
                onChange={(e) =>
                  setHeader({
                    ...header,
                    get_started: { ...header.get_started, label: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Get started URL</label>
              <input
                className="input w-full"
                value={header.get_started.href}
                onChange={(e) =>
                  setHeader({
                    ...header,
                    get_started: { ...header.get_started, href: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={saveHeader.isPending}
            onClick={() => saveHeader.mutate()}
          >
            {saveHeader.isPending ? "Saving…" : "Save header"}
          </button>
        </div>
      ) : (
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <label className="mb-1 block text-sm font-medium">Badge</label>
            <input
              className="input w-full"
              value={footer.badge}
              onChange={(e) => setFooter({ ...footer, badge: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              className="input min-h-24 w-full"
              value={footer.description}
              onChange={(e) => setFooter({ ...footer, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Copyright</label>
              <input
                className="input w-full"
                value={footer.copyright}
                onChange={(e) => setFooter({ ...footer, copyright: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Legal note</label>
              <input
                className="input w-full"
                value={footer.legal_note}
                onChange={(e) => setFooter({ ...footer, legal_note: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Footer columns</p>
              <button type="button" className="btn-ghost text-xs" onClick={addFooterColumn}>
                Add column
              </button>
            </div>
            {footer.columns.map((column, index) => (
              <div
                key={`footer-col-${index}`}
                className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
              >
                <div className="mb-3 flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={column.title}
                    onChange={(e) => updateFooterColumn(index, "title", e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-600"
                    onClick={() => removeFooterColumn(index)}
                  >
                    Remove
                  </button>
                </div>
                <CmsLinkListEditor
                  label="Links"
                  links={column.links}
                  onChange={(links) => updateFooterColumnLinks(index, links)}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={saveFooter.isPending}
            onClick={() => saveFooter.mutate()}
          >
            {saveFooter.isPending ? "Saving…" : "Save footer"}
          </button>
        </div>
      )}

      {message ? <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p> : null}
    </div>
  );
}
