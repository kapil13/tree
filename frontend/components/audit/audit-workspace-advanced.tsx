"use client";

import { useTranslations } from "next-intl";
import { Wrench } from "lucide-react";
import { AuditCrossLinks } from "@/components/audit/audit-cross-links";
import { AuditExplainHistory } from "@/components/audit/audit-explain-history";
import { AuditIntegrityBridgePanel } from "@/components/audit/audit-integrity-bridge-panel";
import { AuditMethodologyPanel } from "@/components/audit/audit-methodology-panel";
import { AuditReauditPanel } from "@/components/audit/audit-reaudit-panel";
import { PortfolioDisclosure } from "@/components/portfolio/portfolio-disclosure";

export function AuditWorkspaceAdvanced({
  projectId,
  engagementId,
  engagementStatus,
  satelliteHref,
}: {
  projectId: string;
  engagementId: string;
  engagementStatus: string;
  satelliteHref: string;
}) {
  const t = useTranslations("auditWorkspace");

  return (
    <PortfolioDisclosure
      title={t("advanced.title")}
      description={t("advanced.desc")}
      icon={Wrench}
      defaultOpen={false}
    >
      <div className="space-y-6">
        <AuditCrossLinks projectId={projectId} satelliteHref={satelliteHref} className="border-0 bg-transparent p-0" />
        <AuditIntegrityBridgePanel engagementId={engagementId} projectId={projectId} />
        <AuditMethodologyPanel engagementId={engagementId} />
        <AuditExplainHistory engagementId={engagementId} />
        <AuditReauditPanel engagementId={engagementId} engagementStatus={engagementStatus} />
      </div>
    </PortfolioDisclosure>
  );
}
