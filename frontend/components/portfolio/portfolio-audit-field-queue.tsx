"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { projectAuditHref } from "@/lib/project-focused-ui";
import { PortfolioSection } from "./portfolio-section";

type FieldPlotQueueItem = {
  plot_id: string;
  plot_code: string;
  project_id: string;
  project_name: string;
  risk_level: string;
};

export function PortfolioAuditFieldQueue({
  queueItems,
  auditFieldOpsHref,
}: {
  queueItems: FieldPlotQueueItem[];
  auditFieldOpsHref: string;
}) {
  const t = useTranslations("portfolioTabs.audit");
  const visibleItems = queueItems.slice(0, 8);

  return (
    <PortfolioSection
      title={t("fieldQueue.title")}
      description={t("fieldQueue.desc")}
      action={{ label: t("fieldQueue.openQueue"), href: auditFieldOpsHref }}
    >
      {visibleItems.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">{t("fieldQueue.empty")}</p>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {visibleItems.map((plot) => (
              <article
                key={plot.plot_id}
                className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-100">{plot.plot_code}</p>
                    <Link
                      href={projectAuditHref(plot.project_id)}
                      className="mt-1 block text-xs text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {plot.project_name}
                    </Link>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                    {plot.risk_level}
                  </span>
                </div>
                <div className="mt-3 text-right">
                  <Link
                    href={auditFieldOpsHref}
                    className="text-xs font-medium text-forest-700 hover:underline dark:text-forest-300"
                  >
                    {t("fieldQueue.recordVisit")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2">{t("table.plot")}</th>
                <th className="px-4 py-2">{t("table.project")}</th>
                <th className="px-4 py-2">{t("table.risk")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((plot) => (
                <tr key={plot.plot_id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2 font-medium">{plot.plot_code}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={projectAuditHref(plot.project_id)}
                      className="text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {plot.project_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{plot.risk_level}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={auditFieldOpsHref}
                      className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                    >
                      {t("fieldQueue.recordVisit")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </PortfolioSection>
  );
}
