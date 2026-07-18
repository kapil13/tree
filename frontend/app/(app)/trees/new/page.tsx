import { Suspense } from "react";
import { NewTreePageClient } from "./new-tree-client";

function NewTreeLoading() {
  return (
    <div className="registration-shell flex min-h-[60vh] items-center justify-center">
      <div className="rounded-3xl border border-stone-200 bg-white/80 px-8 py-6 text-center shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
        <p className="text-sm text-stone-600 dark:text-stone-300">Preparing registration studio…</p>
      </div>
    </div>
  );
}

export default function NewTreePage() {
  return (
    <Suspense fallback={<NewTreeLoading />}>
      <NewTreePageClient />
    </Suspense>
  );
}
