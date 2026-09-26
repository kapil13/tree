import type { Metadata } from "next";

import { DEFAULT_DESCRIPTION, SITE_URL } from "@/lib/seo/site";

const DEFAULT_OG_TITLE = "Aranyix — Intelligence for a Thriving Planet";

/** Brand suffix appended to child document titles and to og/twitter titles. */
const BRAND_TITLE_SUFFIX = " | Aranyix";

/**
 * Homepage document title, og:title, and twitter:title.
 * The homepage is the root segment, so the layout title template is not applied
 * to its `<title>`. Child routes still receive the suffix from that template.
 */
export const HOME_PAGE_TITLE =
  "Plantation MRV for CSR, Mining, CAMPA & Biodiversity | Aranyix";

export function homePageMetadata(): Metadata {
  const segmentTitle = HOME_PAGE_TITLE.endsWith(BRAND_TITLE_SUFFIX)
    ? HOME_PAGE_TITLE.slice(0, -BRAND_TITLE_SUFFIX.length)
    : HOME_PAGE_TITLE;
  return {
    ...buildPageMetadata({
      title: segmentTitle,
      description: DEFAULT_DESCRIPTION,
      path: "/",
    }),
    title: { absolute: HOME_PAGE_TITLE },
  };
}

/** Path-only canonical: no query, no hash, no trailing slash (root stays "/"). */
function canonicalPath(path: string): string {
  const withoutSuffix = path.trim().split(/[?#]/)[0] ?? "";
  const withSlash = withoutSuffix.startsWith("/") ? withoutSuffix : `/${withoutSuffix}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) {
    return withSlash.replace(/\/+$/, "");
  }
  return withSlash || "/";
}

function absoluteCanonicalUrl(path: string): string {
  const canonical = canonicalPath(path);
  return canonical === "/" ? SITE_URL : `${SITE_URL}${canonical}`;
}

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  const canonical = canonicalPath(path);
  const url = absoluteCanonicalUrl(path);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url,
      siteName: "Aranyix",
      title: `${title}${BRAND_TITLE_SUFFIX}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}${BRAND_TITLE_SUFFIX}`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Metadata for `app/not-found.tsx`.
 *
 * A 404 is rendered with the root layout, so `ROOT_METADATA`'s relative
 * canonical (`./`) would otherwise resolve to a self-canonical of the missing
 * URL. `canonical: null` replaces that `alternates` object and emits no
 * canonical link. Robots are left unset: Next.js already injects one
 * `noindex` on 404 responses, and a second robots tag would conflict with it.
 */
export const NOT_FOUND_METADATA: Metadata = {
  alternates: { canonical: null },
};

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_OG_TITLE,
    template: `%s${BRAND_TITLE_SUFFIX}`,
  },
  description: DEFAULT_DESCRIPTION,
  // "./" resolves against the request pathname (no query) via metadataBase.
  // Homepage becomes https://aranyix.tech with no trailing slash.
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "./",
    siteName: "Aranyix",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  // Robots are set per route. A root `index, follow` is also emitted on the
  // 404 page, which already injects `noindex`, so the two tags conflict.
  manifest: "/manifest.webmanifest",
  themeColor: "#052e1f",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "Aranyix",
  },
};
