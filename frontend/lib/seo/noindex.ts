import type { Metadata } from "next";

/**
 * Auth, logged-in app, token, and presentation routes.
 * Google must still be allowed to crawl these URLs (do not Disallow them in
 * robots.txt) until they drop out of the index and can see this tag.
 */
export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
  // Self-canonical for this URL. Do not inherit the homepage canonical.
  alternates: { canonical: "./" },
};
