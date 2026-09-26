"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CmsPageEditor } from "@/components/platform/cms-page-editor";
import { PlatformShell } from "@/components/platform/platform-shell";
import { cmsAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";

export default function PlatformCmsPageDetail() {
  const t = useTranslations("platformAdmin.cmsPageDetail");
  const params = useParams();
  const pageRef = typeof params.id === "string" ? params.id : "";

  const sectionTypesQuery = useQuery({
    queryKey: ["cms-section-types"],
    queryFn: () => cmsAdmin.sectionTypes(),
    retry: 1,
  });

  const pageQuery = useQuery({
    queryKey: ["cms-admin-page", pageRef],
    queryFn: () => cmsAdmin.getPage(pageRef),
    enabled: Boolean(pageRef),
    retry: 1,
  });

  const page = pageQuery.data;
  const sectionTypes = sectionTypesQuery.data;
  const loading = !pageRef || pageQuery.isPending || sectionTypesQuery.isPending;
  const loadError = pageQuery.error ?? sectionTypesQuery.error;

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <Link
            href="/platform/cms"
            className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("backToCms")}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {page?.title ?? t("editPage")}
          </h1>
          {page ? (
            <p className="mt-1 text-sm text-stone-500">
              {page.is_home ? t("homepage") : `/p/${page.slug}`}
              {page.published ? t("published") : t("draft")}
            </p>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : loadError || !page || !sectionTypes ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">{t("loadErrorTitle")}</p>
            <p className="mt-2">
              {loadError ? errorMessage(loadError) : t("loadErrorDeleted")}
            </p>
            <p className="mt-2 text-xs text-amber-800">{t("loadErrorHint")}</p>
          </div>
        ) : (
          <CmsPageEditor page={page} sectionTypes={sectionTypes} />
        )}
      </div>
    </PlatformShell>
  );
}
