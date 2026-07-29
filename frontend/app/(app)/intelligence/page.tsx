"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IntelligenceRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portfolio-health?tab=threats");
  }, [router]);
  return <p className="text-sm text-stone-500">Redirecting to portfolio health…</p>;
}
