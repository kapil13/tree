"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { CmsSectionRenderer } from "@/components/marketing/cms-section-renderer";
import { cmsAdmin, type CmsPage, type CmsSection } from "@/lib/cms-api";
import { defaultSectionContent } from "@/lib/cms-section-templates";
import { errorMessage } from "@/lib/api";

type Props = {
  page: CmsPage & { sections: CmsSection[] };
  sectionTypes: string[];
};

function SectionEditor({
  section,
  onClose,
  onSaved,
}: {
  section: CmsSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [anchorId, setAnchorId] = useState(section.anchor_id ?? "");
  const [sortOrder, setSortOrder] = useState(section.sort_order);
  const [enabled, setEnabled] = useState(section.enabled);
  const [contentJson, setContentJson] = useState(JSON.stringify(section.content, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      let content: Record<string, unknown>;
      try {
        content = JSON.parse(contentJson) as Record<string, unknown>;
        setParseError(null);
      } catch {
        setParseError("Content must be valid JSON.");
        throw new Error("invalid_json");
      }
      return cmsAdmin.updateSection(section.id, {
        title,
        anchor_id: anchorId || null,
        sort_order: sortOrder,
        enabled,
        content,
      });
    },
    onSuccess: () => {
      setMessage("Section saved.");
      onSaved();
    },
    onError: (err) => {
      if (String(err) !== "Error: invalid_json") {
        setMessage(errorMessage(err));
      }
    },
  });

  return (
    <div className="rounded-xl border border-forest-200 bg-forest-50/40 p-4 dark:border-forest-900 dark:bg-forest-950/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">
          Edit section — {section.section_type}
        </h3>
        <button type="button" className="btn-ghost text-xs" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Admin title</label>
          <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Anchor ID</label>
          <input
            className="input w-full"
            placeholder="e.g. platform"
            value={anchorId}
            onChange={(e) => setAnchorId(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Sort order</label>
          <input
            className="input w-full"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled on live site
        </label>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Content (JSON)</label>
        <textarea
          className="input min-h-64 w-full font-mono text-xs"
          value={contentJson}
          onChange={(e) => setContentJson(e.target.value)}
        />
        {parseError ? <p className="mt-1 text-xs text-red-600">{parseError}</p> : null}
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Preview</p>
        <div className="marketing-page overflow-hidden rounded-lg border border-stone-100">
          <CmsSectionRenderer section={{ ...section, title, anchor_id: anchorId || null, content: (() => {
            try {
              return JSON.parse(contentJson) as Record<string, unknown>;
            } catch {
              return section.content;
            }
          })() }} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save section"}
        </button>
        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>
    </div>
  );
}

export function CmsPageEditor({ page, sectionTypes }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState({
    title: page.title,
    slug: page.slug,
    meta_description: page.meta_description,
    published: page.published,
    is_home: page.is_home,
  });
  const [newSectionType, setNewSectionType] = useState(sectionTypes[0] ?? "rich_text");

  const sections = [...page.sections].sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    setPageForm({
      title: page.title,
      slug: page.slug,
      meta_description: page.meta_description,
      published: page.published,
      is_home: page.is_home,
    });
  }, [page]);

  const savePage = useMutation({
    mutationFn: () => cmsAdmin.updatePage(page.id, pageForm),
    onSuccess: () => {
      setMessage("Page settings saved.");
      qc.invalidateQueries({ queryKey: ["cms-admin-page", page.id] });
      qc.invalidateQueries({ queryKey: ["cms-admin-pages"] });
      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const createSection = useMutation({
    mutationFn: () =>
      cmsAdmin.createSection(page.id, {
        section_type: newSectionType,
        title: `New ${newSectionType} section`,
        content: defaultSectionContent(newSectionType),
        sort_order: sections.length * 10,
        enabled: true,
      }),
    onSuccess: () => {
      setMessage("Section added.");
      qc.invalidateQueries({ queryKey: ["cms-admin-page", page.id] });
      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const deleteSection = useMutation({
    mutationFn: (id: string) => cmsAdmin.deleteSection(id),
    onSuccess: () => {
      setEditingId(null);
      setMessage("Section deleted.");
      qc.invalidateQueries({ queryKey: ["cms-admin-page", page.id] });
      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const moveSection = useMutation({
    mutationFn: async ({ section, direction }: { section: CmsSection; direction: -1 | 1 }) => {
      const index = sections.findIndex((s) => s.id === section.id);
      const swap = sections[index + direction];
      if (!swap) return;
      await cmsAdmin.updateSection(section.id, { sort_order: swap.sort_order });
      await cmsAdmin.updateSection(swap.id, { sort_order: section.sort_order });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-admin-page", page.id] });
      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold">Page settings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              className="input w-full"
              value={pageForm.title}
              onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              className="input w-full"
              value={pageForm.slug}
              disabled={pageForm.is_home}
              onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Meta description</label>
            <textarea
              className="input min-h-20 w-full"
              value={pageForm.meta_description}
              onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pageForm.published}
              onChange={(e) => setPageForm({ ...pageForm, published: e.target.checked })}
            />
            Published
          </label>
          {!pageForm.is_home ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pageForm.is_home}
                onChange={(e) => setPageForm({ ...pageForm, is_home: e.target.checked })}
              />
              Set as homepage
            </label>
          ) : (
            <p className="text-sm text-stone-500">This page is the marketing homepage.</p>
          )}
        </div>
        <button
          type="button"
          className="btn-primary mt-4"
          disabled={savePage.isPending}
          onClick={() => savePage.mutate()}
        >
          {savePage.isPending ? "Saving…" : "Save page settings"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sections</h2>
            <p className="text-sm text-stone-500">Add, reorder, and edit homepage sections.</p>
          </div>
          <div className="flex gap-2">
            <select
              className="input"
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value)}
            >
              {sectionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary"
              disabled={createSection.isPending}
              onClick={() => createSection.mutate()}
            >
              <Plus className="h-4 w-4" />
              Add section
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <div>
                  <p className="font-medium">
                    {section.title || section.section_type}
                    {!section.enabled ? (
                      <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        Hidden
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-stone-500">
                    {section.section_type}
                    {section.anchor_id ? ` · #${section.anchor_id}` : ""}
                    {" · order "}
                    {section.sort_order}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={index === 0 || moveSection.isPending}
                    onClick={() => moveSection.mutate({ section, direction: -1 })}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={index === sections.length - 1 || moveSection.isPending}
                    onClick={() => moveSection.mutate({ section, direction: 1 })}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-600"
                    disabled={deleteSection.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this section?")) {
                        deleteSection.mutate(section.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editingId === section.id ? (
                <div className="mt-3">
                  <SectionEditor
                    section={section}
                    onClose={() => setEditingId(null)}
                    onSaved={() => {
                      qc.invalidateQueries({ queryKey: ["cms-admin-page", page.id] });
                      qc.invalidateQueries({ queryKey: ["cms-public-site"] });
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {message ? <p className="text-sm text-stone-600 dark:text-stone-300">{message}</p> : null}
    </div>
  );
}
