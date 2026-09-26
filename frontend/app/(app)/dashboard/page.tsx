"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth, useAuthHydrated } from "@/lib/auth-store";
import { userHasProfessionalAccess } from "@/lib/nav-access";

const CitizenDashboard = dynamic(
  () => import("@/components/dashboard/citizen-dashboard").then((m) => ({ default: m.CitizenDashboard })),
  { loading: () => <DashboardLoading /> },
);

const ExecutiveDashboard = dynamic(
  () =>
    import("@/components/dashboard/executive-dashboard").then((m) => ({
      default: m.ExecutiveDashboard,
    })),
  { loading: () => <DashboardLoading /> },
);

const FieldWorkerDashboard = dynamic(
  () =>
    import("@/components/dashboard/field-worker-dashboard").then((m) => ({
      default: m.FieldWorkerDashboard,
    })),
  { loading: () => <DashboardLoading /> },
);

function DashboardLoading() {
  const t = useTranslations("dashboard");
  return <p className="text-sm text-stone-500">{t("loading")}</p>;
}

export default function DashboardPage() {
  const hydrated = useAuthHydrated();
  const { user } = useAuth();
  const tc = useTranslations("common");

  if (!hydrated) {
    return <p className="text-sm text-stone-500">{tc("loading")}</p>;
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
