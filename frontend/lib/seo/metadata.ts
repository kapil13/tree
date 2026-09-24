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

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const url = `${SITE_URL}${canonical}`;

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

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_OG_TITLE,
    template: `%s${BRAND_TITLE_SUFFIX}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Aranyix",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
