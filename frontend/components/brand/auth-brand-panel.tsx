import { AranyixLogo } from "@/components/brand/aranyix-logo";
import {
  Bell,
  Bird,
  Brain,
  Leaf,
  Satellite,
  Sparkles,
  TreePine,
} from "lucide-react";

const CAPABILITIES = [
  { icon: Satellite, label: "Satellite monitoring" },
  { icon: TreePine, label: "Tree health analytics" },
  { icon: Bird, label: "Biodiversity richness" },
  { icon: Brain, label: "AI recommendations" },
  { icon: Bell, label: "Real-time alerts" },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#041f17] p-8 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(74,222,128,0.22),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,rgba(5,46,31,0.2),rgba(4,31,23,0.95))]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative space-y-8">
        <AranyixLogo className="h-16 w-auto max-w-[280px]" />
        <div className="space-y-4">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Data, intelligence, and nature — unified for planetary stewardship.
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-emerald-100/80">
            Register trees, monitor ecosystems, assess biodiversity, and build audit-ready evidence
            for carbon and compliance programs — from citizen BYOT tagging to government-grade MRV.
          </p>
        </div>
      </div>

      <div className="relative space-y-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
            >
              <Icon className="mb-2 h-4 w-4 text-lime-300" />
              <p className="text-xs font-medium leading-snug text-emerald-50/90">{label}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <Sparkles className="mb-2 h-4 w-4 text-lime-300" />
            <p className="text-xs font-medium leading-snug text-emerald-50/90">Carbon intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100/70">
          <Leaf className="h-3.5 w-3.5 text-lime-300" />
          Data · Intelligence · Nature · Future
        </div>
      </div>
    </div>
  );
}
