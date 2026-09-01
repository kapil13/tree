"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { portfolioThreatsHref } from "@/lib/portfolio-health-links";

export default function IntelligenceRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(portfolioThreatsHref());
  }, [router]);
  return <p className="text-sm text-stone-500">Redirecting to portfolio health…</p>;
}
