"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { cmsAdmin } from "@/lib/cms-api";
import { cn } from "@/lib/cn";
import { COMPLIANCE_MODE_STYLES } from "@/lib/rule-template-fields";

export function SchemesTab({ onOpenTemplate }: { onOpenTemplate: (code: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cms-scheme-template-map"],
    queryFn: () => cmsAdmin.schemeTemplateMap(),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-stone-500">Loading scheme map…</p>;
  }

  const grouped = data.reduce<Record<string, typeof data>>((acc, row) => {
    const key = row.ministry;
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold">Scheme ↔ template map</h3>
        <p className="mt-1 text-sm text-stone-600">
          See which central government scheme links to each planting template. Click a template to
          jump to its rule editor.
        </p>
      </div>

      {Object.entries(grouped).map(([ministry, rows]) => (
        <section key={ministry} className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{ministry}</h4>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <article
                key={row.scheme_code}
                className="card flex flex-col gap-3 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-50">{row.scheme_label}</p>
                  <p className="mt-1 font-mono text-xs text-stone-500">{row.scheme_code}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold uppercase ring-1",
                      COMPLIANCE_MODE_STYLES[row.default_compliance_mode] ??
                        COMPLIANCE_MODE_STYLES.open,
                    )}
                  >
                    {row.default_compliance_mode}
                  </span>
                  {row.checklist_codes.map((c) => (
                    <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-auto border-t border-stone-100 pt-3 dark:border-stone-800">
                  {row.default_template_code ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-lg bg-forest-50 px-3 py-2 text-left text-sm font-medium text-forest-800 hover:bg-forest-100"
                      onClick={() => onOpenTemplate(row.default_template_code!)}
                    >
                      <span>{row.template_name ?? row.default_template_code}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  ) : (
                    <p className="text-xs text-stone-500">No default template — uses segment default</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <p className="flex items-center gap-2 text-xs text-stone-500">
        <ExternalLink className="h-3.5 w-3.5" />
        Scheme definitions remain in code; this view shows live template linkage.
      </p>
    </div>
  );
}
