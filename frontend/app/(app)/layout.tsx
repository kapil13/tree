import { Suspense } from "react";
import { InviteAcceptHandler } from "@/components/auth/invite-accept-flow";
import { AppAuthGuard } from "@/components/app-auth-guard";
import { RouteAccessGuard } from "@/components/route-access-guard";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <ImpersonationBanner />
          <Topbar />
          <main className="flex-1 bg-stone-50 p-6 dark:bg-stone-950">
            <Suspense fallback={null}>
              <InviteAcceptHandler />
            </Suspense>
            <RouteAccessGuard>{children}</RouteAccessGuard>
          </main>
        </div>
      </div>
    </AppAuthGuard>
  );
}
