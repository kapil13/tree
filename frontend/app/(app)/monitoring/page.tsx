"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MonitoringRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portfolio-health?tab=monitoring");
  }, [router]);
  return <p className="text-sm text-stone-500">Redirecting to portfolio health…</p>;
}
