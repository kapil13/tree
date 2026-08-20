import { Suspense } from "react";
import { InviteAcceptHandler } from "@/components/auth/invite-accept-flow";
import { AppAuthGuard } from "@/components/app-auth-guard";
import { RouteAccessGuard } from "@/components/route-access-guard";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ImpersonationBanner } from "@/components/platform/impersonation-banner";
import { OrgFeatureFlagsBanner } from "@/components/org-feature-flags-banner";
import { MaintenanceBanner } from "@/components/platform/maintenance-banner";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-0.5 bg-stone-200/80 dark:bg-stone-800">
            <ImpersonationBanner />
            <MaintenanceBanner />
            <OrgFeatureFlagsBanner />
          </div>
          <Topbar />
          <main className="flex-1 bg-stone-50 p-4 dark:bg-stone-950 md:p-6">
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
