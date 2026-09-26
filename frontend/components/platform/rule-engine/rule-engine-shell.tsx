"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  FileJson,
  Gauge,
  History,
  LayoutGrid,
  Link2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ChecklistsTab } from "./rule-engine-checklists-tab";
import { HistoryTab } from "./rule-engine-history-tab";
import { SchemesTab } from "./rule-engine-schemes-tab";
import { TemplatesTab } from "./rule-engine-templates-tab";
import { ToolsTab } from "./rule-engine-tools-tab";

type RuleEngineTab = "templates" | "schemes" | "checklists" | "history" | "tools";

const TABS: Array<{
  id: RuleEngineTab;
  label: string;
  hint: string;
  icon: typeof Gauge;
}> = [
  {
    id: "templates",
    label: "Templates",
    hint: "Spacing, pit, species & density rules",
    icon: LayoutGrid,
  },
  { id: "schemes", label: "Schemes", hint: "Government scheme ↔ template map", icon: Link2 },
  {
    id: "checklists",
    label: "Checklists",
    hint: "Audit checklist question editor",
    icon: ClipboardCheck,
  },
  { id: "history", label: "History", hint: "Versions & rollback", icon: History },
  { id: "tools", label: "Tools", hint: "Preview, import & export", icon: Wrench },
];

export function RuleEngineShell() {
  const [tab, setTab] = useState<RuleEngineTab>("templates");
  const [jumpTemplate, setJumpTemplate] = useState<string | null>(null);

  function openTemplate(code: string) {
    setJumpTemplate(code);
    setTab("templates");
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-forest-200/70 bg-gradient-to-br from-forest-700 via-forest-800 to-stone-900 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Gauge className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-forest-200/90">
              Platform CMS
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Compliance rule engine</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-forest-100/90">
              Configure planting templates, link government schemes, edit audit checklists, preview
              enforcement, and roll back changes — all without a code deploy.
            </p>
          </div>
        </div>
      </header>

      <nav
        className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white/80 p-2 shadow-sm backdrop-blur dark:border-stone-700 dark:bg-stone-900/80"
        aria-label="Rule engine sections"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-w-[9.5rem] flex-1 flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition-all",
                active
                  ? "bg-forest-600 text-white shadow-md"
                  : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-snug",
                  active ? "text-forest-100" : "text-stone-500 dark:text-stone-400",
                )}
              >
                {item.hint}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-[28rem]">
        {tab === "templates" && (
          <TemplatesTab jumpTemplateCode={jumpTemplate} onJumpConsumed={() => setJumpTemplate(null)} />
        )}
        {tab === "schemes" && <SchemesTab onOpenTemplate={openTemplate} />}
        {tab === "checklists" && <ChecklistsTab />}
        {tab === "history" && <HistoryTab onOpenTemplate={openTemplate} />}
        {tab === "tools" && <ToolsTab />}
      </div>

      <footer className="flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-4 py-3 text-xs text-stone-500 dark:border-stone-700">
        <FileJson className="h-3.5 w-3.5" />
        Changes publish live to tree registration, compliance checks, and MRV exports.
      </footer>
    </div>
  );
}
