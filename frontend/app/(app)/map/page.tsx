"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { useMapProjectScope } from "@/lib/use-map-project-scope";

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
  const { projectId, projectName } = useMapProjectScope();

  return (
    <div className="space-y-4">
      <PageHeader
        purpose={tm("purpose")}
        title={tm("title")}
        description={tm("description")}
        breadcrumbs={[{ label: tc("sectionOperate") }, { label: tc("breadcrumbMap") }]}
      />
      {projectId && projectName ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          Showing trees for <span className="font-medium">{projectName}</span>. Clear the project
          picker in the top bar to view the full portfolio.
        </p>
      ) : null}
      <TreesMap mapType="roadmap" height="min(70vh, 640px)" showFilters />
    </div>
  );
}
