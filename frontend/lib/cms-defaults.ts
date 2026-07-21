import type { CmsLink, CmsPublicSite, CmsSection } from "@/lib/cms-api";

export const CMS_HEADER_FALLBACK: CmsPublicSite["site"]["header"] = {
  nav: [
    { label: "Platform", href: "#platform" },
    { label: "Compliance", href: "#compliance" },
    { label: "Programs", href: "#programs" },
    { label: "How it works", href: "#how-it-works" },
  ],
  sign_in: { label: "Sign in", href: "/auth?mode=signin" },
  get_started: { label: "Get started", href: "/auth?mode=signup" },
};

export const CMS_FOOTER_FALLBACK: CmsPublicSite["site"]["footer"] = {
  description:
    "Environmental monitoring, reporting, and verification for plantations, biodiversity, and carbon programs — from satellite pixels to audit-ready evidence.",
  badge: "Intelligence for a thriving planet",
  columns: [
    {
      title: "Platform",
      links: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Register a tree", href: "/auth?mode=signup" },
      ],
    },
  ],
  copyright: "Aranyix. All rights reserved.",
  legal_note: "Apache-2.0 · Open MRV infrastructure",
};

export const CMS_HOME_FALLBACK: CmsPublicSite = {
  site: { header: CMS_HEADER_FALLBACK, footer: CMS_FOOTER_FALLBACK },
  page: {
    id: "fallback",
    slug: "home",
    title: "Aranyix",
    meta_description: "Environmental MRV platform",
    published: true,
    is_home: true,
    sort_order: 0,
    updated_at: null,
    sections: [],
  },
};

export type CmsCta = { label: string; href: string };

export function linkProps(link?: CmsLink) {
  return link ?? { label: "Learn more", href: "/" };
}

export function sectionByAnchor(sections: CmsSection[], anchor: string) {
  return sections.find((s) => s.anchor_id === anchor);
}
