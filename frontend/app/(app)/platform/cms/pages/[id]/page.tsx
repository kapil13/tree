"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CmsPageEditor } from "@/components/platform/cms-page-editor";
import { cmsAdmin } from "@/lib/cms-api";

export default function PlatformCmsPageDetail({
  params,
}: {
  params: { id: string };
}) {
  const { data: sectionTypes } = useQuery({
    queryKey: ["cms-section-types"],
    queryFn: () => cmsAdmin.sectionTypes(),
  });

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["cms-admin-page", params.id],
    queryFn: () => cmsAdmin.getPage(params.id),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/platform/cms"
          className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Website CMS
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {page?.title ?? "Edit page"}
        </h1>
        {page ? (
          <p className="mt-1 text-sm text-stone-500">
            {page.is_home ? "Homepage" : `/p/${page.slug}`}
            {page.published ? " · Published" : " · Draft"}
          </p>
        ) : null}
      </div>

      {isLoading || !sectionTypes ? (
        <p className="text-sm text-stone-500">Loading page…</p>
      ) : error || !page ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load this page. It may have been deleted.
        </div>
      ) : (
        <CmsPageEditor page={page} sectionTypes={sectionTypes} />
      )}
    </div>
  );
}
