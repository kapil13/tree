"use client";

import dynamic from "next/dynamic";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { userHasProfessionalAccess } from "@/lib/nav-access";

const CitizenDashboard = dynamic(
  () => import("@/components/dashboard/citizen-dashboard").then((m) => ({ default: m.CitizenDashboard })),
  { loading: () => <p className="text-sm text-stone-500">Loading dashboard…</p> },
);

const ExecutiveDashboard = dynamic(
  () =>
    import("@/components/dashboard/executive-dashboard").then((m) => ({
      default: m.ExecutiveDashboard,
    })),
  { loading: () => <p className="text-sm text-stone-500">Loading dashboard…</p> },
);

const FieldWorkerDashboard = dynamic(
  () =>
    import("@/components/dashboard/field-worker-dashboard").then((m) => ({
      default: m.FieldWorkerDashboard,
    })),
  { loading: () => <p className="text-sm text-stone-500">Loading dashboard…</p> },
);

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

  return <CitizenDashboard />;
}
