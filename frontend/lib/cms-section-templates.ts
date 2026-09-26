/** Default section content when creating a new CMS section in the admin panel. */

export const CMS_SECTION_TEMPLATES: Record<string, Record<string, unknown>> = {
  hero: {
    pill: "Environmental MRV platform",
    pill_icon: "Sparkles",
    title: "Intelligence for a",
    title_highlight: "thriving planet",
    subtitle: "Describe your platform value proposition here.",
    primary_cta: { label: "Get started", href: "/auth?mode=signup" },
    secondary_cta: { label: "Sign in", href: "/auth?mode=signin" },
    stats: [
      { value: "10M+", label: "Trees at scale" },
      { value: "24/7", label: "Monitoring" },
    ],
    float_cards: [
      { icon: "Satellite", title: "Live NDVI scan", subtitle: "Updated daily" },
    ],
  },
  features: {
    eyebrow: "Platform capabilities",
    title: "Everything you need to monitor environmental impact",
    copy: "Describe your core capabilities.",
    items: [
      {
        icon: "TreePine",
        title: "Tree monitoring",
        description: "Register trees with GPS, photos, and digital passports.",
        accent: "from-emerald-500/20 to-emerald-900/5",
      },
    ],
  },
  compliance: {
    eyebrow: "Compliance & frameworks",
    title: "Built for the standards auditors ask about",
    copy: "List supported frameworks.",
    items: [
      {
        icon: "Globe2",
        code: "IPCC AR6",
        title: "Science-based carbon",
        description: "Aligned with IPCC guidance.",
      },
    ],
  },
  programs: {
    eyebrow: "Planting programs",
    title: "One account. Multiple pathways.",
    copy: "Describe enrollment options.",
    items: [
      {
        icon: "Leaf",
        title: "BYOT Public",
        description: "Citizen tree tagging.",
        badge: "Popular",
      },
    ],
  },
  steps: {
    eyebrow: "How it works",
    title: "From first tree to audit-ready portfolio",
    copy: "Outline your onboarding flow.",
    cta: { label: "Create your workspace", href: "/auth?mode=signup" },
    items: [
      { step: "01", title: "Register", description: "Choose your program and onboard." },
      { step: "02", title: "Capture", description: "Add trees with GPS and photos." },
    ],
  },
  platform_preview: {
    eyebrow: "Inside the platform",
    title: "A command center for plantations and biodiversity",
    copy: "Highlight dashboard capabilities.",
    bullets: ["Interactive maps", "Executive dashboards", "REST API"],
    metrics: [
      ["12,480", "Trees registered"],
      ["0.72", "Mean NDVI"],
    ],
    rows: [
      ["Satellite canopy stress", "2 sites flagged"],
      ["Carbon projection", "1,240 tCO₂e est."],
    ],
  },
  cta: {
    eyebrow: "Ready to begin?",
    title: "Turn every tree into verified environmental intelligence",
    copy: "Closing call to action.",
    primary_cta: { label: "Get started free", href: "/auth?mode=signup" },
    secondary_cta: { label: "Sign in", href: "/auth?mode=signin" },
  },
  rich_text: {
    html: "<p>Add your custom content here. Supports basic HTML.</p>",
  },
};

export function defaultSectionContent(sectionType: string): Record<string, unknown> {
  return structuredClone(CMS_SECTION_TEMPLATES[sectionType] ?? { body: "" });
}
