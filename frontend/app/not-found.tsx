import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { NOT_FOUND_METADATA } from "@/lib/seo/metadata";

export const metadata = NOT_FOUND_METADATA;

export default async function NotFound() {
  const t = await getTranslations("marketing");

  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">{t("pageNotFound")}</h1>
      <Link href="/" className="mt-4 inline-block text-forest-700 hover:underline">
        {t("backToHome")}
      </Link>
    </main>
  );
}
