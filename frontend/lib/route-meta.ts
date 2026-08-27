/** Route title/section/breadcrumb translation keys for app chrome. */

export type RouteKeyMeta = {
  titleKey: string;
  sectionKey?: string;
  breadcrumbs?: Array<{ labelKey: string; href?: string }>;
};

const ROUTE_KEYS: Record<string, RouteKeyMeta> = {
  "/dashboard": {
    titleKey: "routeCommandCenter",
    sectionKey: "sectionOverview",
    breadcrumbs: [{ labelKey: "sectionOverview" }, { labelKey: "routeCommandCenter" }],
  },
  "/stewardship": {
    titleKey: "routeStewardship",
    sectionKey: "sectionOverview",
    breadcrumbs: [{ labelKey: "sectionOverview" }, { labelKey: "routeStewardship" }],
  },
  "/projects": {
    titleKey: "routePlantingProjects",
    sectionKey: "sectionOperate",
    breadcrumbs: [{ labelKey: "sectionOperate" }, { labelKey: "breadcrumbProjects" }],
  },
  "/trees": {
    titleKey: "routeTreeRegistry",
    sectionKey: "sectionOperate",
    breadcrumbs: [{ labelKey: "sectionOperate" }, { labelKey: "routeTreeRegistry" }],
  },
  "/map": {
    titleKey: "routeGeospatialMap",
    sectionKey: "sectionOperate",
    breadcrumbs: [{ labelKey: "sectionOperate" }, { labelKey: "breadcrumbMap" }],
  },
  "/field-ops": {
    titleKey: "routeFieldOperations",
    sectionKey: "sectionOperate",
    breadcrumbs: [{ labelKey: "sectionOperate" }, { labelKey: "breadcrumbFieldOps" }],
  },
  "/portfolio-health": {
    titleKey: "routePortfolioIntelligence",
    sectionKey: "sectionIntelligence",
    breadcrumbs: [{ labelKey: "sectionIntelligence" }, { labelKey: "breadcrumbPortfolio" }],
  },
  "/satellite": {
    titleKey: "routeSatelliteMonitoring",
    sectionKey: "sectionIntelligence",
    breadcrumbs: [{ labelKey: "sectionIntelligence" }, { labelKey: "breadcrumbSatellite" }],
  },
  "/bioacoustic": {
    titleKey: "routeBioacoustic",
    sectionKey: "sectionIntelligence",
    breadcrumbs: [{ labelKey: "sectionIntelligence" }, { labelKey: "breadcrumbBiodiversity" }],
  },
  "/monitoring": {
    titleKey: "routeMonitoring",
    sectionKey: "sectionIntelligence",
    breadcrumbs: [{ labelKey: "sectionIntelligence" }, { labelKey: "breadcrumbMonitoring" }],
  },
  "/intelligence": {
    titleKey: "routeIntelligenceSummary",
    sectionKey: "sectionIntelligence",
    breadcrumbs: [{ labelKey: "sectionIntelligence" }, { labelKey: "breadcrumbSummary" }],
  },
  "/alerts": {
    titleKey: "routeAlertsSignals",
    sectionKey: "sectionIntelligence",
    breadcrumbs: [{ labelKey: "sectionIntelligence" }, { labelKey: "breadcrumbAlerts" }],
  },
  "/reports": {
    titleKey: "routeReportsExports",
    sectionKey: "sectionReports",
    breadcrumbs: [{ labelKey: "sectionReports" }, { labelKey: "breadcrumbExports" }],
  },
  "/assistant": {
    titleKey: "routeAiAssistant",
    sectionKey: "sectionReports",
    breadcrumbs: [{ labelKey: "sectionReports" }, { labelKey: "breadcrumbAssistant" }],
  },
  "/settings": {
    titleKey: "routeSettings",
    sectionKey: "sectionAccount",
    breadcrumbs: [{ labelKey: "sectionAccount" }, { labelKey: "routeSettings" }],
  },
};

export function resolveRouteKeys(pathname: string | null): RouteKeyMeta | null {
  if (!pathname) return null;
  if (ROUTE_KEYS[pathname]) return ROUTE_KEYS[pathname];

  if (pathname.startsWith("/projects/") && pathname.includes("/compliance")) {
    return {
      titleKey: "routeCompliance",
      sectionKey: "sectionOperate",
      breadcrumbs: [
        { labelKey: "sectionOperate", href: "/projects" },
        { labelKey: "breadcrumbProject" },
        { labelKey: "routeCompliance" },
      ],
    };
  }
  if (pathname.startsWith("/projects/")) {
    return {
      titleKey: "routeProjectWorkspace",
      sectionKey: "sectionOperate",
      breadcrumbs: [
        { labelKey: "sectionOperate", href: "/projects" },
        { labelKey: "breadcrumbProject" },
      ],
    };
  }
  if (pathname.startsWith("/trees/")) {
    return {
      titleKey: "routeTreeDetail",
      sectionKey: "sectionOperate",
      breadcrumbs: [
        { labelKey: "sectionOperate", href: "/trees" },
        { labelKey: "breadcrumbTree" },
      ],
    };
  }
  if (pathname.startsWith("/platform")) {
    return {
      titleKey: "routePlatformAdmin",
      sectionKey: "sectionAdministration",
      breadcrumbs: [{ labelKey: "sectionAdministration" }, { labelKey: "breadcrumbPlatform" }],
    };
  }
  return null;
}

/** @deprecated Use useRouteMeta hook in client components */
export type RouteMeta = {
  title: string;
  section?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

/** @deprecated Use useRouteMeta hook in client components */
export function resolveRouteMeta(pathname: string | null): RouteMeta | null {
  const keys = resolveRouteKeys(pathname);
  if (!keys) return null;
  return {
    title: keys.titleKey,
    section: keys.sectionKey,
    breadcrumbs: keys.breadcrumbs?.map((c) => ({ label: c.labelKey, href: c.href })),
  };
}
