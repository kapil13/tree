"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { portfolioHealthHref, type PortfolioHealthTab } from "@/lib/portfolio-health-links";
import { PortfolioTabBanner } from "./portfolio-tab-banner";

export function PortfolioTabShell({
  tab,
  projectId,
  projectName,
  actions,
  children,
}: {
  tab: PortfolioHealthTab;
  projectId?: string | null;
  projectName?: string | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("portfolioTabs");

  return (
    <div className="space-y-6">
      <PortfolioTabBanner variant="info" description={t(`${tab}.intro`)} />

      {projectId && projectName ? (
        <PortfolioTabBanner
          variant="scope"
          description={t("scope.showingProject", { project: projectName })}
          action={{
            label: t("scope.viewAllProjects"),
            href: portfolioHealthHref(tab),
          }}
        />
      ) : null}

      {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}

      {children}
    </div>
  );
}
