"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGateway } from "@/components/auth/auth-gateway";

function AuthPageInner() {
  const params = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  return <AuthGateway initialMode={mode} />;
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4faf6] text-sm text-stone-600">
          Loading secure sign-in…
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
