import type { MetadataRoute } from "next";

import { getAllResources } from "@/lib/content/resources";
import { MONEY_PAGE_PATHS } from "@/lib/seo/solution-pages";
import { SITE_URL } from "@/lib/seo/site";

const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/demo", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resources", changeFrequency: "weekly", priority: 0.7 },
  { path: "/product/mrv", changeFrequency: "monthly", priority: 0.85 },
  { path: "/partners/agencies", changeFrequency: "monthly", priority: 0.75 },
  { path: "/solutions", changeFrequency: "monthly", priority: 0.85 },
  { path: "/solutions/csr-plantation", changeFrequency: "monthly", priority: 0.9 },
  { path: "/solutions/mining-greening", changeFrequency: "monthly", priority: 0.9 },
  { path: "/solutions/campa-afforestation", changeFrequency: "monthly", priority: 0.9 },
  { path: "/solutions/brsr-esg", changeFrequency: "monthly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/data-use", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const paths = new Set([...PUBLIC_ROUTES.map((route) => route.path), ...MONEY_PAGE_PATHS]);
  const resources = await getAllResources();

  const staticEntries = PUBLIC_ROUTES.filter((route) => paths.has(route.path)).map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const resourceEntries = resources.map((resource) => ({
    url: `${SITE_URL}/resources/${resource.slug}`,
    lastModified: new Date(resource.date),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...resourceEntries];
}
