import { ROOT_METADATA } from "@/lib/seo/metadata";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Reusable JSON-LD builders for marketing pages.
 *
 * Solution and resource landings call these by default. A new page such as
 * `/solutions/industrial-site-greening` picks up a Home → Solutions → page
 * trail when it renders through `SolutionLandingPage` (or calls
 * `solutionPageBreadcrumbJsonLd` with its title and path). Resource guides
 * pick up Home → Resources → title plus Article schema from
 * `ResourceArticlePage`.
 */

export type BreadcrumbCrumb = {
  name: string;
  path: string;
};

export type JsonLdObject = Record<string, unknown>;

const HOME_CRUMB: BreadcrumbCrumb = { name: "Home", path: "/" };
const SOLUTIONS_CRUMB: BreadcrumbCrumb = { name: "Solutions", path: "/solutions" };
const RESOURCES_CRUMB: BreadcrumbCrumb = { name: "Resources", path: "/resources" };

/** Normalize a site path to the form used by canonical metadata. */
export function canonicalPath(path: string): string {
  const withoutSuffix = path.trim().split(/[?#]/)[0] ?? "";
  const withSlash = withoutSuffix.startsWith("/") ? withoutSuffix : `/${withoutSuffix}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) {
    return withSlash.replace(/\/+$/, "");
  }
  return withSlash || "/";
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${canonicalPath(path)}`;
}

/**
 * ISO date (`YYYY-MM-DD`) for schema fields. YAML dates arrive as `Date`;
 * quoted frontmatter stays a string. Blank values are omitted.
 */
export function readSchemaDate(value: unknown): string | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

/** JSON-LD in a script tag. `<` is escaped so markup in titles cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** BCP 47 language from an Open Graph locale (`en_IN` → `en-IN`). */
export function inLanguageFromOpenGraphLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const match = locale.match(/^([a-zA-Z]{2,3})[_-]([a-zA-Z]{2})$/);
  if (!match) return undefined;
  return `${match[1].toLowerCase()}-${match[2].toUpperCase()}`;
}

function siteInLanguage(): string | undefined {
  const openGraph = ROOT_METADATA.openGraph;
  if (!openGraph || Array.isArray(openGraph)) return undefined;
  const locale = openGraph.locale;
  return inLanguageFromOpenGraphLocale(typeof locale === "string" ? locale : undefined);
}

export function breadcrumbListJsonLd(crumbs: BreadcrumbCrumb[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Home → Solutions. */
export function solutionHubBreadcrumbJsonLd(): JsonLdObject {
  return breadcrumbListJsonLd([HOME_CRUMB, SOLUTIONS_CRUMB]);
}

/**
 * BreadcrumbList for `/solutions` (Home → Solutions) and `/solutions/*`
 * (Home → Solutions → page). Other paths return null so product, demo, and
 * partner landings keep their existing schema only.
 */
export function solutionPageBreadcrumbJsonLd(page: {
  name: string;
  path: string;
}): JsonLdObject | null {
  const path = canonicalPath(page.path);
  if (path === "/solutions") return solutionHubBreadcrumbJsonLd();
  if (!path.startsWith("/solutions/")) return null;
  return breadcrumbListJsonLd([HOME_CRUMB, SOLUTIONS_CRUMB, { name: page.name, path }]);
}

/** Home → Resources. */
export function resourceHubBreadcrumbJsonLd(): JsonLdObject {
  return breadcrumbListJsonLd([HOME_CRUMB, RESOURCES_CRUMB]);
}

/** Home → Resources → guide title. `path` is the guide canonical path. */
export function resourceGuideBreadcrumbJsonLd(guide: {
  name: string;
  path: string;
}): JsonLdObject {
  const path = canonicalPath(guide.path);
  return breadcrumbListJsonLd([HOME_CRUMB, RESOURCES_CRUMB, { name: guide.name, path }]);
}

function aranyixOrganization(): JsonLdObject {
  return {
    "@type": "Organization",
    name: "Aranyix",
    url: SITE_URL,
  };
}

export type ArticleJsonLdInput = {
  headline: string;
  /** Meta description shown for the guide. */
  description: string;
  datePublished: unknown;
  dateModified?: unknown;
  path: string;
};

/**
 * Article JSON-LD for a published resource guide.
 * `dateModified` is included only when frontmatter provides one.
 * `inLanguage` is included when the site Open Graph locale maps to a BCP 47 tag.
 */
export function articleJsonLd(input: ArticleJsonLdInput): JsonLdObject {
  const url = absoluteUrl(input.path);
  const datePublished = readSchemaDate(input.datePublished) ?? String(input.datePublished ?? "");
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    datePublished,
    author: aranyixOrganization(),
    publisher: aranyixOrganization(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  const dateModified = readSchemaDate(input.dateModified);
  if (dateModified) data.dateModified = dateModified;

  const inLanguage = siteInLanguage();
  if (inLanguage) data.inLanguage = inLanguage;

  return data;
}

/** Article schema for `/resources/[slug]`, using the guide meta description. */
export function resourceArticleJsonLd(article: {
  title: string;
  description: string;
  date: unknown;
  dateModified?: unknown;
  slug: string;
}): JsonLdObject {
  return articleJsonLd({
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.dateModified,
    path: `/resources/${article.slug}`,
  });
}
