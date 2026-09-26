"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { portfolioThreatsHref } from "@/lib/portfolio-health-links";

export default function IntelligenceRedirectPage() {
  const t = useTranslations("intelligencePage");
  const router = useRouter();
  useEffect(() => {
    router.replace(portfolioThreatsHref());
  }, [router]);
  return <p className="text-sm text-stone-500">{t("redirecting")}</p>;
}
