import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bird,
  Brain,
  Building2,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  TreePine,
  Users,
} from "lucide-react";
import { HeroEmblem } from "@/components/marketing/hero-emblem";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

const STATS = [
  { value: "10M+", label: "Trees at planetary scale" },
  { value: "100+", label: "Species in AI catalog" },
  { value: "24/7", label: "Satellite & alert monitoring" },
  { value: "IPCC", label: "AR6-aligned carbon engine" },
];

const FEATURES = [
  {
    icon: TreePine,
    title: "Tree monitoring",
    description:
      "Register every tree with GPS, photos, species, and a unique digital passport — QR code and PDF included.",
    accent: "from-emerald-500/20 to-emerald-900/5",
  },
  {
    icon: Bird,
    title: "Biodiversity assessment",
    description:
      "Bioacoustic listening, species richness scoring, and habitat signals to quantify ecosystem health beyond carbon.",
    accent: "from-lime-500/20 to-lime-900/5",
  },
  {
    icon: Brain,
    title: "AI insights & tips",
    description:
      "Species detection, disease classification, growth recommendations, and executive summaries powered by environmental AI.",
    accent: "from-sky-500/15 to-sky-900/5",
  },
  {
    icon: Bell,
    title: "Monitoring & alerts",
    description:
      "NDVI change detection, health drift, fence breaches, and anomaly alerts delivered to teams in real time.",
    accent: "from-amber-500/15 to-amber-900/5",
  },
  {
    icon: Satellite,
    title: "Satellite intelligence",
    description:
      "Sentinel-2 and Landsat pipelines for NDVI, canopy stress, and plantation boundary validation at scale.",
    accent: "from-teal-500/15 to-teal-900/5",
  },
  {
    icon: FileCheck2,
    title: "Audit-ready reporting",
    description:
      "Carbon projections, Verra VM0047 pathways, Gold Standard outputs, and exportable PDF / Excel evidence packs.",
    accent: "from-violet-500/12 to-violet-900/5",
  },
];

const COMPLIANCE = [
  {
    icon: Globe2,
    code: "IPCC AR6",
    title: "Science-based carbon",
    description: "Tiered emission factors, biomass models, and growth curves aligned with IPCC AR6 guidance.",
  },
  {
    icon: Sprout,
    code: "REDD+",
    title: "Forest carbon MRV",
    description: "Baseline, leakage, and permanence evidence structures for REDD+ and jurisdictional programs.",
  },
  {
    icon: ShieldCheck,
    code: "Paris Agreement",
    title: "NDC & Article 6",
    description: "Traceable planting records that support national commitments and cooperative approaches.",
  },
  {
    icon: MapPin,
    code: "NHAI / Govt",
    title: "Highway & public schemes",
    description: "Geo-tagged planting proof for NHAI, forest department, and municipal greening audits.",
  },
  {
    icon: Radar,
    code: "NGT / Courts",
    title: "Compensatory afforestation",
    description: "Timestamped evidence chains for CAMPA, FCA compliance, and judicial monitoring orders.",
  },
  {
    icon: FileCheck2,
    code: "Verra VCS",
    title: "Verified carbon units",
    description: "VM0047-ready project data, permanence buffers, and monitoring report foundations.",
  },
  {
    icon: Sparkles,
    code: "Gold Standard",
    title: "Premium credits",
    description: "Co-benefit documentation for biodiversity, community, and SDG-linked outcomes.",
  },
  {
    icon: Leaf,
    code: "BYOT",
    title: "Citizen stewardship",
    description: "Bring Your Own Tree — lightweight public registration that scales into verified portfolios.",
  },
];

const PROGRAMS = [
  {
    icon: Leaf,
    title: "BYOT Public",
    description: "Citizens and schools tag trees in minutes with mobile-first registration and QR passports.",
    badge: "Most popular",
  },
  {
    icon: Building2,
    title: "Government & NHAI",
    description: "Audit-grade planting for highways, urban forestry, and departmental compensatory schemes.",
    badge: "Govt ready",
  },
  {
    icon: ShieldCheck,
    title: "Industry & Corporate ESG",
    description: "Plantation baselines, supplier traceability, and board-ready sustainability evidence.",
    badge: "ESG",
  },
  {
    icon: Users,
    title: "NGO & Community",
    description: "Watershed restoration, farmer groups, and community nurseries with shared dashboards.",
    badge: "Community",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Register & enroll",
    description: "Choose your program — BYOT, government, ESG, or NGO — and onboard your organization in one flow.",
  },
  {
    step: "02",
    title: "Capture evidence",
    description: "Add trees with GPS, photos, and species. Mobile apps and web wizards guide every required field.",
  },
  {
    step: "03",
    title: "Monitor continuously",
    description: "Satellite NDVI, AI health scoring, and bioacoustic biodiversity layers watch your sites 24/7.",
  },
  {
    step: "04",
    title: "Report with confidence",
    description: "Export compliance-ready dashboards, alerts, and carbon reports mapped to your frameworks.",
  },
];

const PLATFORM_POINTS = [
  "Interactive Google Maps plantation view with health overlays",
  "Executive dashboards for carbon, biodiversity, and alerts",
  "Multi-program enrollment on a single account",
  "REST API for integrations, GIS exports, and enterprise SSO",
];

export function HomePageContent() {
  return (
    <div className="marketing-page">
      <MarketingHeader />

      <main>
        <section className="marketing-hero">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="space-y-8">
              <div className="marketing-pill">
                <Sparkles className="h-3.5 w-3.5 text-lime-400" />
                Environmental MRV platform
              </div>

              <div className="space-y-5">
                <h1 className="marketing-hero-title">
                  Intelligence for a
                  <span className="marketing-gradient-text"> thriving planet</span>
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-stone-600">
                  Aranyix unifies tree registration, satellite monitoring, biodiversity signals, and
                  AI insights into one premium platform — so every planting program can prove impact
                  with audit-ready evidence.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/auth?mode=signup" className="btn-primary px-6 py-3 text-base">
                  Start free registration
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard" className="btn-secondary px-6 py-3 text-base">
                  Explore dashboard
                </Link>
              </div>

              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {STATS.map((stat) => (
                  <div key={stat.label} className="marketing-stat">
                    <dt className="text-2xl font-bold text-forest-800">{stat.value}</dt>
                    <dd className="mt-1 text-xs leading-snug text-stone-500">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
              <div className="marketing-hero-visual">
                <HeroEmblem className="relative z-10 h-auto w-full drop-shadow-2xl" />
              </div>

              <div className="marketing-float-card marketing-float-card--left">
                <Satellite className="h-4 w-4 text-lime-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Live NDVI scan</p>
                  <p className="text-[11px] text-emerald-100/70">Sentinel-2 · updated daily</p>
                </div>
              </div>

              <div className="marketing-float-card marketing-float-card--right">
                <Bird className="h-4 w-4 text-lime-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Biodiversity index</p>
                  <p className="text-[11px] text-emerald-100/70">+18 species this season</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-6 py-20">
          <div className="marketing-section-head">
            <p className="marketing-eyebrow">Platform capabilities</p>
            <h2 className="marketing-section-title">
              Everything you need to monitor, understand, and prove environmental impact
            </h2>
            <p className="marketing-section-copy">
              From a single citizen tree to million-tree portfolios, Aranyix delivers the same
              premium monitoring stack — designed for field teams, scientists, and compliance officers.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className={`marketing-feature-card bg-gradient-to-br ${feature.accent}`}>
                <div className="marketing-feature-icon">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-stone-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="compliance" className="marketing-band">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="marketing-section-head marketing-section-head--light">
              <p className="marketing-eyebrow marketing-eyebrow--light">Compliance & frameworks</p>
              <h2 className="marketing-section-title text-white">
                Built for the standards your auditors already ask about
              </h2>
              <p className="marketing-section-copy text-emerald-100/75">
                Aranyix maps field evidence, satellite signals, and AI analytics to the frameworks
                behind carbon markets, government planting schemes, and environmental litigation.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COMPLIANCE.map((item) => (
                <article key={item.code} className="marketing-compliance-tile">
                  <div className="flex items-start justify-between gap-3">
                    <div className="marketing-compliance-icon">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="marketing-compliance-code">{item.code}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="programs" className="mx-auto max-w-7xl px-6 py-20">
          <div className="marketing-section-head">
            <p className="marketing-eyebrow">Planting programs</p>
            <h2 className="marketing-section-title">One account. Multiple compliance pathways.</h2>
            <p className="marketing-section-copy">
              Enroll in BYOT, government, corporate ESG, or NGO programs from a single workspace.
              Each pathway applies the right validation rules without fragmenting your data.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {PROGRAMS.map((program) => (
              <article key={program.title} className="marketing-program-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="marketing-program-icon">
                    <program.icon className="h-5 w-5" />
                  </div>
                  <span className="marketing-program-badge">{program.badge}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-stone-900">{program.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{program.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="marketing-section-head lg:sticky lg:top-28">
              <p className="marketing-eyebrow">How it works</p>
              <h2 className="marketing-section-title">From first tree to audit-ready portfolio</h2>
              <p className="marketing-section-copy">
                A guided flow for field teams, backed by automated monitoring and executive reporting.
              </p>
              <Link href="/auth?mode=signup" className="btn-primary mt-8 inline-flex">
                Create your workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {STEPS.map((step) => (
                <article key={step.step} className="marketing-step-card">
                  <span className="marketing-step-number">{step.step}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="marketing-preview">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <p className="marketing-eyebrow marketing-eyebrow--light">Inside the platform</p>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  A command center for plantations, carbon, and biodiversity
                </h2>
                <p className="text-sm leading-relaxed text-emerald-100/75">
                  Executive dashboards surface tree health, satellite anomalies, species richness,
                  and alert queues — with exports tailored to your enrolled programs.
                </p>
                <ul className="space-y-3">
                  {PLATFORM_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-emerald-50/90">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="marketing-preview-panel">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Live overview</p>
                    <p className="mt-1 text-lg font-semibold text-white">Plantation health</p>
                  </div>
                  <span className="rounded-full bg-lime-400/15 px-3 py-1 text-xs font-medium text-lime-300">
                    Healthy
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 p-5">
                  {[
                    ["12,480", "Trees registered"],
                    ["0.72", "Mean NDVI"],
                    ["94%", "Passport complete"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xl font-semibold text-white">{value}</p>
                      <p className="mt-1 text-[11px] text-emerald-100/65">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 px-5 pb-5">
                  {[
                    ["Satellite canopy stress", "2 sites flagged"],
                    ["Bioacoustic richness", "Stable this week"],
                    ["Carbon projection", "1,240 tCO₂e est."],
                  ].map(([title, value]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="text-sm text-emerald-50/85">{title}</span>
                      <span className="text-xs font-medium text-lime-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="marketing-cta">
            <div className="relative z-10 max-w-2xl">
              <p className="marketing-eyebrow marketing-eyebrow--light">Ready to begin?</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Turn every tree into verified environmental intelligence
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-emerald-100/75">
                Join organizations using Aranyix for plantation monitoring, biodiversity assessment,
                and compliance-ready carbon evidence — from citizen BYOT to government-grade MRV.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth?mode=signup" className="btn-primary bg-white px-6 py-3 text-base text-forest-900 hover:bg-emerald-50">
                  Get started free
                </Link>
                <Link href="/auth?mode=signin" className="btn-secondary border-white/20 bg-white/5 px-6 py-3 text-base text-white hover:bg-white/10">
                  Sign in to workspace
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
