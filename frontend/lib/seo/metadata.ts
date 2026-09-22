import type { Metadata } from "next";

import { DEFAULT_DESCRIPTION, SITE_URL } from "@/lib/seo/site";

const DEFAULT_OG_TITLE = "Aranyix — Intelligence for a Thriving Planet";

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
      title: `${title} | Aranyix`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Aranyix`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_OG_TITLE,
    template: "%s | Aranyix",
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
