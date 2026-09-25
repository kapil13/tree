import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

/**
 * App, auth, token, and presentation routes send noindex (meta robots and
 * X-Robots-Tag). Do not Disallow them until they drop out of Google's index —
 * Google has to crawl the URL to see noindex. After they drop, disallow:
 * /auth, /login, /signup, /onboarding, /verify, /impact, /p/, /dashboard,
 * /settings, /platform, /projects, /intelligence, /trees, /satellite,
 * /field-ops, /monitoring, /portfolio-health, /bioacoustic, /alerts,
 * /assistant, /reports, /map, /tools, /verification, /stewardship,
 * /presentation, /presentationa.
 *
 * /api/ stays disallowed: it is a reverse proxy, not an HTML document.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
