import { Leaf, Satellite, TreePine, Bird, Brain } from "lucide-react";

const CAPABILITIES = [
  { icon: Satellite, label: "Satellite MRV" },
  { icon: TreePine, label: "Tree health" },
  { icon: Bird, label: "Biodiversity" },
  { icon: Brain, label: "AI insights" },
];

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden h-full min-h-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#041f17] p-6 text-white lg:flex lg:flex-col lg:justify-between xl:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(74,222,128,0.22),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,rgba(5,46,31,0.2),rgba(4,31,23,0.95))]" />
      <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-200/90">
          <Leaf className="h-3 w-3" />
          Aranyix platform
        </div>
        <div className="space-y-2.5">
          <h1 className="max-w-md text-2xl font-semibold leading-tight tracking-tight xl:text-[1.75rem]">
            Data, intelligence, and nature — unified for planetary stewardship.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-emerald-100/75">
            Tree registration, ecosystem monitoring, and audit-ready evidence — from field teams to
            government-grade MRV.
          </p>
        </div>
      </div>

      <div className="relative mt-6 space-y-4">
        <ul className="grid grid-cols-2 gap-2">
          {CAPABILITIES.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-lime-300" />
              <span className="text-xs font-medium text-emerald-50/90">{label}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-100/55">
          <Leaf className="h-3 w-3 text-lime-300" />
          Data · Intelligence · Nature · Future
        </p>
      </div>
    </aside>
  );
}
