"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { portfolioMonitoringHref } from "@/lib/portfolio-health-links";

export default function MonitoringRedirectPage() {
  const t = useTranslations("monitoringPage");
  const router = useRouter();
  useEffect(() => {
    router.replace(portfolioMonitoringHref());
  }, [router]);
  return <p className="text-sm text-stone-500">{t("redirecting")}</p>;
}
