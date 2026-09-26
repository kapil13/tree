export type MarketingNavLink = {
  label: string;
  href: string;
  description?: string;
};

export type MarketingMegaMenuColumn = {
  title: string;
  links: MarketingNavLink[];
};

export type MarketingMegaMenu = {
  id: string;
  label: string;
  href?: string;
  featured?: MarketingNavLink;
  columns?: MarketingMegaMenuColumn[];
};

/** Primary marketing header navigation — mega menus + top-level links. */
export const MARKETING_HEADER_NAV: MarketingMegaMenu[] = [
  {
    id: "platform",
    label: "Platform",
    featured: {
      label: "Platform overview",
      href: "/#platform",
      description: "Field registration, satellite fusion, and audit-ready exports",
    },
    columns: [
      {
        title: "Capabilities",
        links: [
          { label: "Intelligence pipeline", href: "/#intelligence" },
          { label: "Biodiversity", href: "/#biodiversity" },
          { label: "Carbon intelligence", href: "/#carbon-intelligence" },
          { label: "Reports hub", href: "/#reports" },
        ],
      },
      {
        title: "Get started",
        links: [
          { label: "How it works", href: "/#how-it-works" },
          { label: "Programs", href: "/#programs" },
          { label: "Compliance", href: "/#compliance" },
          { label: "Product MRV", href: "/product/mrv" },
        ],
      },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    featured: {
      label: "All solutions",
      href: "/solutions",
      description: "CSR, mining, CAMPA, BRSR, and industrial greening programmes",
    },
    columns: [
      {
        title: "By programme",
        links: [
          { label: "CSR plantation MRV", href: "/solutions/csr-plantation" },
          { label: "Mining green belts", href: "/solutions/mining-greening" },
          { label: "CAMPA afforestation", href: "/solutions/campa-afforestation" },
          { label: "BRSR & ESG evidence", href: "/solutions/brsr-esg" },
          { label: "Industrial site greening", href: "/solutions/industrial-site-greening" },
        ],
      },
      {
        title: "Partners & pilots",
        links: [
          { label: "Government agencies", href: "/partners/agencies" },
          { label: "Request a demo", href: "/demo" },
          { label: "Guides & resources", href: "/resources" },
        ],
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    href: "/resources",
  },
  {
    id: "contact",
    label: "Contact",
    href: "/contact",
  },
];
