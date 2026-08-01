"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { TurnstileCaptcha } from "@/components/auth/turnstile-captcha";

function MobileCaptchaInner() {
  const searchParams = useSearchParams();
  const siteKey = searchParams.get("sitekey") ?? "";
  const theme = (searchParams.get("theme") as "light" | "dark" | "auto") || "light";

  if (!siteKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] p-4">
        <p className="text-center text-sm text-amber-900">Missing site key.</p>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ background: theme === "dark" ? "#0b1220" : "#f8faf8" }}
    >
      <TurnstileCaptcha
        siteKey={siteKey}
        theme={theme}
        onTokenChange={(token) => {
          window.location.href = `aranyix://captcha?token=${encodeURIComponent(token)}`;
        }}
      />
    </main>
  );
}

export default function MobileCaptchaPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f8faf8]" />}>
      <MobileCaptchaInner />
    </Suspense>
  );
}
