"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Search } from "lucide-react";
import { cmsAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

export function ChecklistsTab() {
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({
    queryKey: ["cms-checklist-overrides"],
    queryFn: () => cmsAdmin.listChecklistOverrides(),
  });

  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [edits, setEdits] = useState<Record<string, { question: string; guidance: string }>>({});
  const [message, setMessage] = useState<string | null>(null);

  const selectedCode = code || list?.[0]?.checklist_code || "";

  const { data: detail } = useQuery({
    queryKey: ["cms-checklist-detail", selectedCode],
    queryFn: () => cmsAdmin.getChecklistOverride(selectedCode),
    enabled: Boolean(selectedCode),
  });

  useEffect(() => {
    if (!detail) return;
    setEnabled(Boolean(detail.override?.enabled));
    const initial: Record<string, { question: string; guidance: string }> = {};
    for (const item of detail.effective_items) {
      initial[item.id] = { question: item.question, guidance: item.guidance };
    }
    setEdits(initial);
  }, [detail]);

  const filtered = (list ?? []).filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.checklist_code.toLowerCase().includes(search.toLowerCase()),
  );

  const save = useMutation({
    mutationFn: () => {
      const item_overrides: Record<string, unknown> = {};
      if (!detail) throw new Error("No checklist");
      for (const item of detail.code_items) {
        const edit = edits[item.id];
        if (!edit) continue;
        if (edit.question !== item.question || edit.guidance !== item.guidance) {
          item_overrides[item.id] = {
            question: edit.question,
            guidance: edit.guidance,
          };
        }
      }
      return cmsAdmin.updateChecklistOverride(selectedCode, { enabled, item_overrides });
    },
    onSuccess: () => {
      setMessage("Checklist saved.");
      qc.invalidateQueries({ queryKey: ["cms-checklist-overrides"] });
      qc.invalidateQueries({ queryKey: ["cms-checklist-detail", selectedCode] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  if (isLoading) return <p className="text-sm text-stone-500">Loading checklists…</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(220px,260px)_1fr]">
      <aside className="card flex flex-col overflow-hidden p-0">
        <div className="border-b border-stone-100 p-3 dark:border-stone-800">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              className="input w-full pl-9"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <ul className="max-h-[480px] overflow-y-auto p-2">
          {filtered.map((c) => (
            <li key={c.checklist_code}>
              <button
                type="button"
                onClick={() => setCode(c.checklist_code)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left text-sm",
                  selectedCode === c.checklist_code
                    ? "bg-forest-50 font-medium text-forest-900"
                    : "hover:bg-stone-50",
                )}
              >
                <span className="flex items-center gap-2">
                  {c.short_label}
                  {c.has_custom_items && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                </span>
                <span className="block text-xs text-stone-500">{c.framework_reference}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-4">
        {detail ? (
          <>
            <div className="card">
              <h3 className="text-lg font-semibold">{detail.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{detail.description}</p>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Use CMS checklist overrides
              </label>
            </div>

            <div className="space-y-3">
              {detail.code_items.map((item) => (
                <article key={item.id} className="card space-y-2">
                  <p className="text-xs font-semibold uppercase text-stone-500">{item.category}</p>
                  <input
                    className="input font-medium"
                    value={edits[item.id]?.question ?? item.question}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [item.id]: {
                          question: e.target.value,
                          guidance: prev[item.id]?.guidance ?? item.guidance,
                        },
                      }))
                    }
                  />
                  <textarea
                    className="input min-h-[72px] text-sm"
                    value={edits[item.id]?.guidance ?? item.guidance}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [item.id]: {
                          question: prev[item.id]?.question ?? item.question,
                          guidance: e.target.value,
                        },
                      }))
                    }
                  />
                </article>
              ))}
            </div>

            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <button
              type="button"
              className="btn-primary"
              disabled={save.isPending}
              onClick={() => {
                setMessage(null);
                save.mutate();
              }}
            >
              <Save className="h-4 w-4" />
              Save checklist
            </button>
          </>
        ) : (
          <p className="text-sm text-stone-500">Select a checklist</p>
        )}
      </div>
    </div>
  );
}
