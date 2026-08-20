"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Droplets,
  Handshake,
  Leaf,
  Route,
  Search,
  Sprout,
  Trees,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { CentralScheme, ComplianceMode } from "@/lib/api";
import { SCHEME_GROUP_LABEL, type CentralSchemeGroup } from "@/lib/schemes";
import { cn } from "@/lib/cn";

const SCHEME_ICONS: Record<string, LucideIcon> = {
  campa_ca: Trees,
  gim_restoration: Sprout,
  mishti_mangrove: Waves,
  nagar_van: Building2,
  nhai_highway: Route,
  mgnrega_convergence: Users,
  jal_shakti_riparian: Droplets,
  green_credit_india: BadgeCheck,
  sahakar_van: Handshake,
};

const SCHEME_ACCENT: Record<string, string> = {
  campa_ca: "from-emerald-500/15 to-emerald-600/5 text-emerald-700 ring-emerald-500/30",
  gim_restoration: "from-green-500/15 to-lime-600/5 text-green-700 ring-green-500/30",
  mishti_mangrove: "from-teal-500/15 to-cyan-600/5 text-teal-800 ring-teal-500/30",
  nagar_van: "from-violet-500/15 to-purple-600/5 text-violet-800 ring-violet-500/30",
  nhai_highway: "from-sky-500/15 to-blue-600/5 text-sky-800 ring-sky-500/30",
  mgnrega_convergence: "from-amber-500/15 to-orange-600/5 text-amber-900 ring-amber-500/30",
  jal_shakti_riparian: "from-cyan-500/15 to-blue-500/5 text-cyan-800 ring-cyan-500/30",
  green_credit_india: "from-forest-500/15 to-emerald-600/5 text-forest-800 ring-forest-500/30",
  sahakar_van: "from-orange-500/15 to-amber-600/5 text-orange-900 ring-orange-500/30",
};

const MINISTRY_TONE: Record<string, string> = {
  MoEFCC: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  "MoRTH / NHAI": "bg-sky-50 text-sky-800 ring-sky-100",
  "Jal Shakti": "bg-cyan-50 text-cyan-800 ring-cyan-100",
  "Rural Development": "bg-amber-50 text-amber-900 ring-amber-100",
  "Ministry of Cooperation": "bg-orange-50 text-orange-900 ring-orange-100",
};

function complianceLabel(mode: ComplianceMode): string {
  if (mode === "strict") return "Strict audit";
  if (mode === "guided") return "Guided";
  return "Open";
}

function SchemeCard({
  scheme,
  selected,
  onSelect,
}: {
  scheme: CentralScheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = SCHEME_ICONS[scheme.code] ?? Leaf;
  const accent = SCHEME_ACCENT[scheme.code] ?? "from-stone-500/10 to-stone-600/5 text-stone-700 ring-stone-300";
  const ministryTone = MINISTRY_TONE[scheme.ministry] ?? "bg-stone-100 text-stone-700 ring-stone-200";
  const survival = scheme.kpi_targets.survival_pct_min;
  const geo = scheme.kpi_targets.geo_tagged_pct_min;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border p-4 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2",
        selected
          ? "border-forest-500 bg-gradient-to-br from-forest-50/90 to-white shadow-md ring-2 ring-forest-500/20"
          : "border-stone-200/90 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
            accent,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-forest-600 bg-forest-600 text-white"
              : "border-stone-300 bg-white text-transparent group-hover:border-stone-400",
          )}
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-snug text-stone-900 dark:text-stone-50">
            {scheme.label}
          </h3>
        </div>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
            ministryTone,
          )}
        >
          {scheme.ministry}
        </span>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">{scheme.description}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
          {complianceLabel(scheme.default_compliance_mode)}
        </span>
        {survival != null && (
          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            ≥{survival}% survival
          </span>
        )}
        {geo != null && (
          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            ≥{geo}% geo-tag
          </span>
        )}
      </div>
    </button>
  );
}

function SelectionPreview({ scheme }: { scheme: CentralScheme }) {
  const Icon = SCHEME_ICONS[scheme.code] ?? Leaf;
  const fieldCount =
    (scheme.metadata_sections?.[0] as { fields?: unknown[] } | undefined)?.fields?.length ?? 0;

  return (
    <div className="rounded-2xl border border-forest-200/80 bg-gradient-to-br from-forest-50/80 via-white to-white p-5 shadow-sm dark:border-forest-900/50 dark:from-forest-950/40 dark:to-stone-900">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">Selected scheme</p>
      <div className="mt-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-600 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 dark:text-stone-50">{scheme.label}</p>
          <p className="mt-0.5 text-xs text-stone-500">{scheme.ministry}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-xs text-stone-600">
        <li className="flex gap-2">
          <span className="text-forest-600">✓</span>
          Auto-attaches {scheme.checklist_codes.length} compliance checklist
          {scheme.checklist_codes.length === 1 ? "" : "s"}
        </li>
        {fieldCount > 0 && (
          <li className="flex gap-2">
            <span className="text-forest-600">✓</span>
            {fieldCount} govt reference fields in project settings
          </li>
        )}
        <li className="flex gap-2">
          <span className="text-forest-600">✓</span>
          Segment defaults to {scheme.default_segment.replace(/_/g, " ")}
        </li>
      </ul>
    </div>
  );
}

export function ProjectWizardSteps({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Choose scheme" },
    { n: 2, label: "Project details" },
    { n: 3, label: "Draw work areas", muted: true },
  ] as const;

  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {steps.map((s, i) => (
        <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                step === s.n
                  ? "bg-forest-600 text-white shadow-sm"
                  : step > s.n
                    ? "bg-forest-100 text-forest-800"
                    : "bg-stone-100 text-stone-400",
                "muted" in s && s.muted && step < s.n && "opacity-60",
              )}
            >
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs font-medium sm:block",
                step === s.n ? "text-forest-800" : "text-stone-500",
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "hidden h-px flex-1 sm:block",
                step > s.n ? "bg-forest-300" : "bg-stone-200",
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

export function SchemePickerStep({
  schemes,
  schemesByGroup,
  schemesLoading,
  selectedScheme,
  search,
  onSearchChange,
  onSelectScheme,
  flexOptions,
  selectedFlexCode,
  onSelectFlex,
  onContinue,
}: {
  schemes: CentralScheme[];
  schemesByGroup: Record<CentralSchemeGroup, CentralScheme[]>;
  schemesLoading: boolean;
  selectedScheme: CentralScheme | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectScheme: (scheme: CentralScheme) => void;
  flexOptions: readonly { code: string; label: string; hint: string }[];
  selectedFlexCode: string | null;
  onSelectFlex: (code: string) => void;
  onContinue: () => void;
}) {
  const query = search.trim().toLowerCase();

  function matchesScheme(scheme: CentralScheme): boolean {
    if (!query) return true;
    return (
      scheme.label.toLowerCase().includes(query) ||
      scheme.ministry.toLowerCase().includes(query) ||
      scheme.description.toLowerCase().includes(query) ||
      scheme.code.toLowerCase().includes(query)
    );
  }

  const filteredGroups = (["central", "cooperative", "convergence", "corporate"] as CentralSchemeGroup[])
    .map((group) => ({
      group,
      items: schemesByGroup[group].filter(matchesScheme),
    }))
    .filter((g) => g.items.length > 0);

  const hasSelection = Boolean(selectedScheme || selectedFlexCode);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          className="input pl-10"
          placeholder="Search schemes — CAMPA, NHAI, MISHTI, Sahakar Van…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search central schemes"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="space-y-8">
          {schemesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl border border-stone-100 bg-stone-50"
                />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
              No schemes match &ldquo;{search}&rdquo;. Try CAMPA, highway, or mangrove.
            </p>
          ) : (
            filteredGroups.map(({ group, items }) => (
              <section key={group}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {SCHEME_GROUP_LABEL[group]}
                  </h2>
                  <span className="text-xs text-stone-400">{items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((scheme) => (
                    <SchemeCard
                      key={scheme.code}
                      scheme={scheme}
                      selected={selectedScheme?.code === scheme.code}
                      onSelect={() => onSelectScheme(scheme)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          <section className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-4 dark:border-stone-700 dark:bg-stone-900/30">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Without a central scheme tag
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Corporate CSR sites that are not registered under a central govt programme.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {flexOptions.map((flex) => (
                <button
                  key={flex.code}
                  type="button"
                  onClick={() => onSelectFlex(flex.code)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition hover:shadow-sm",
                    selectedFlexCode === flex.code
                      ? "border-forest-500 bg-forest-50 ring-2 ring-forest-500/20"
                      : "border-stone-200 bg-white hover:border-stone-300",
                  )}
                >
                  <div className="font-medium text-stone-900">{flex.label}</div>
                  <div className="mt-1 text-xs text-stone-500">{flex.hint}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden xl:block xl:sticky xl:top-6">
          {selectedScheme ? (
            <SelectionPreview scheme={selectedScheme} />
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/30 p-5 text-center dark:border-stone-700">
              <Leaf className="mx-auto h-8 w-8 text-stone-300" />
              <p className="mt-3 text-sm font-medium text-stone-600">Pick a scheme</p>
              <p className="mt-1 text-xs text-stone-400">
                Compliance checklists and govt reference fields are configured automatically.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-stone-200/80 bg-stone-50/95 px-4 py-4 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/95 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-stone-600">
            {selectedScheme ? (
              <span>
                <span className="font-medium text-stone-900">{selectedScheme.label}</span>
                <span className="text-stone-400"> · {selectedScheme.ministry}</span>
              </span>
            ) : selectedFlexCode ? (
              <span className="font-medium text-stone-900">
                {flexOptions.find((f) => f.code === selectedFlexCode)?.label}
              </span>
            ) : (
              <span className="text-stone-400">Select a scheme to continue</span>
            )}
          </div>
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={!hasSelection}
            onClick={onContinue}
          >
            Continue to project details
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
