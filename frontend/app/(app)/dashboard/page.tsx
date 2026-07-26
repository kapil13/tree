"use client";

import { CitizenDashboard } from "@/components/dashboard/citizen-dashboard";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { FieldWorkerDashboard } from "@/components/dashboard/field-worker-dashboard";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { userHasProfessionalAccess } from "@/lib/nav-access";

export default function DashboardPage() {
  const hydrated = useAuthHydrated();
  const { user } = useAuth();

  if (!hydrated) {
    return <p className="text-sm text-stone-500">Loading workspace…</p>;
  }

  if (user?.role === "field_worker") {
    return <FieldWorkerDashboard />;
  }

  if (
    user?.role === "admin" ||
    user?.role === "field_supervisor" ||
    userHasProfessionalAccess(user)
  ) {
    return <ExecutiveDashboard />;
  }

  // Citizen BYOT (role user/farmer) and other non-professional accounts
  return <CitizenDashboard />;
}
