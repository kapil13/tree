"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";

function MapLoading() {
  const tm = useTranslations("map");
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-500">
      {tm("loading")}
    </div>
  );
}

const TreesMap = dynamic(
  () => import("@/components/trees-map").then((m) => ({ default: m.TreesMap })),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

export default function MapPage() {
  const tm = useTranslations("map");
  const tc = useTranslations("chrome");

  return (
    <div className="space-y-4">
      <PageHeader
        purpose={tm("purpose")}
        title={tm("title")}
        description={tm("description")}
        breadcrumbs={[{ label: tc("sectionOperate") }, { label: tc("breadcrumbMap") }]}
      />
      <TreesMap mapType="roadmap" height="min(70vh, 640px)" showFilters />
    </div>
  );
}
