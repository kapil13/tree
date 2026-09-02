"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { portfolioMonitoringHref } from "@/lib/portfolio-health-links";

export default function MonitoringRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(portfolioMonitoringHref());
  }, [router]);
  return <p className="text-sm text-stone-500">Redirecting to portfolio health…</p>;
}
