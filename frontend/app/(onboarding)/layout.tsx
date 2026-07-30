import { Suspense } from "react";
import Link from "next/link";
import { AppAuthGuard } from "@/components/app-auth-guard";
import { AranyixMark } from "@/components/brand/aranyix-logo";
import { InviteAcceptHandler } from "@/components/auth/invite-accept-flow";

export const dynamic = "force-dynamic";

/** Minimal chrome for professional onboarding — no sidebar/topbar. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-forest-50 via-stone-50 to-stone-100">
        <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <AranyixMark className="h-8 w-8" />
              <span className="text-lg font-semibold text-forest-900">Aranyix</span>
            </Link>
            <Link href="/trees/new" className="text-xs font-medium text-forest-800 hover:underline">
              Continue with BYOT
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
          <Suspense fallback={null}>
            <InviteAcceptHandler />
          </Suspense>
          {children}
        </main>
      </div>
    </AppAuthGuard>
  );
}
