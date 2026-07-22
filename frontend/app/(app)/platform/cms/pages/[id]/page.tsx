"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CmsPageEditor } from "@/components/platform/cms-page-editor";
import { cmsAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";

export default function PlatformCmsPageDetail() {
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

      {loading ? (
        <p className="text-sm text-stone-500">Loading page…</p>
      ) : loadError || !page || !sectionTypes ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Could not load this page.</p>
          <p className="mt-2">
            {loadError
              ? errorMessage(loadError)
              : "The page may have been deleted, or your session may have expired."}
          </p>
          <p className="mt-2 text-xs text-amber-800">
            Try signing out and back in, then open Website CMS again.
          </p>
        </div>
      ) : (
        <CmsPageEditor page={page} sectionTypes={sectionTypes} />
      )}
    </div>
  );
}
