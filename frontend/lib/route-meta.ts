/** Route titles and breadcrumbs for consistent app chrome (topbar + page headers). */

export type RouteMeta = {
  title: string;
  section?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "Command center",
    section: "Overview",
    breadcrumbs: [{ label: "Overview" }, { label: "Command center" }],
  },
  "/stewardship": {
    title: "Stewardship",
    section: "Overview",
    breadcrumbs: [{ label: "Overview" }, { label: "Stewardship" }],
  },
  "/projects": {
    title: "Planting projects",
    section: "Operate",
    breadcrumbs: [{ label: "Operate" }, { label: "Projects" }],
  },
  "/trees": {
    title: "Tree registry",
    section: "Operate",
    breadcrumbs: [{ label: "Operate" }, { label: "Tree registry" }],
  },
  "/map": {
    title: "Geospatial map",
    section: "Operate",
    breadcrumbs: [{ label: "Operate" }, { label: "Map" }],
  },
  "/field-ops": {
    title: "Field operations",
    section: "Operate",
    breadcrumbs: [{ label: "Operate" }, { label: "Field ops" }],
  },
  "/portfolio-health": {
    title: "Portfolio intelligence",
    section: "Intelligence",
    breadcrumbs: [{ label: "Intelligence" }, { label: "Portfolio" }],
  },
  "/satellite": {
    title: "Satellite monitoring",
    section: "Intelligence",
    breadcrumbs: [{ label: "Intelligence" }, { label: "Satellite" }],
  },
  "/bioacoustic": {
    title: "Biodiversity acoustics",
    section: "Intelligence",
    breadcrumbs: [{ label: "Intelligence" }, { label: "Biodiversity" }],
  },
  "/monitoring": {
    title: "Monitoring",
    section: "Intelligence",
    breadcrumbs: [{ label: "Intelligence" }, { label: "Monitoring" }],
  },
  "/intelligence": {
    title: "Intelligence summary",
    section: "Intelligence",
    breadcrumbs: [{ label: "Intelligence" }, { label: "Summary" }],
  },
  "/alerts": {
    title: "Alerts & signals",
    section: "Intelligence",
    breadcrumbs: [{ label: "Intelligence" }, { label: "Alerts" }],
  },
  "/reports": {
    title: "Reports & exports",
    section: "Reports",
    breadcrumbs: [{ label: "Reports" }, { label: "Exports" }],
  },
  "/assistant": {
    title: "AI assistant",
    section: "Reports",
    breadcrumbs: [{ label: "Reports" }, { label: "Assistant" }],
  },
  "/settings": {
    title: "Settings",
    section: "Account",
    breadcrumbs: [{ label: "Account" }, { label: "Settings" }],
  },
};

export function resolveRouteMeta(pathname: string | null): RouteMeta | null {
  if (!pathname) return null;
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];

  if (pathname.startsWith("/projects/") && pathname.includes("/compliance")) {
    return {
      title: "Compliance",
      section: "Operate",
      breadcrumbs: [{ label: "Operate", href: "/projects" }, { label: "Project" }, { label: "Compliance" }],
    };
  }
  if (pathname.startsWith("/projects/")) {
    return {
      title: "Project workspace",
      section: "Operate",
      breadcrumbs: [{ label: "Operate", href: "/projects" }, { label: "Project" }],
    };
  }
  if (pathname.startsWith("/trees/")) {
    return {
      title: "Tree detail",
      section: "Operate",
      breadcrumbs: [{ label: "Operate", href: "/trees" }, { label: "Tree" }],
    };
  }
  if (pathname.startsWith("/platform")) {
    return {
      title: "Platform administration",
      section: "Administration",
      breadcrumbs: [{ label: "Administration" }, { label: "Platform" }],
    };
  }
  return null;
}
