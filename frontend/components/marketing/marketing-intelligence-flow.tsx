"use client";

import { ArrowRight, Bird, FileCheck2, Satellite, Smartphone, Sparkles } from "lucide-react";

const NODES = [
  {
    icon: Smartphone,
    title: "Field capture",
    copy: "GPS trees, photos, chainage, offline mobile sync",
    tone: "from-emerald-500/25 to-emerald-900/10",
  },
  {
    icon: Satellite,
    title: "Satellite fusion",
    copy: "NDVI, Sentinel SAR integrity, plantation boundaries",
    tone: "from-sky-500/20 to-sky-900/10",
  },
  {
    icon: Bird,
    title: "Bioacoustic",
    copy: "BirdNET species richness & habitat signals",
    tone: "from-lime-500/20 to-lime-900/10",
  },
  {
    icon: Sparkles,
    title: "AI intelligence",
    copy: "Health scoring, alerts, executive summaries",
    tone: "from-violet-500/15 to-violet-900/10",
  },
  {
    icon: FileCheck2,
    title: "Audit exports",
    copy: "BRSR, ISO 14064-2, TNFD, VM0047 evidence packs",
    tone: "from-amber-500/15 to-amber-900/10",
  },
] as const;

export function MarketingIntelligenceFlow({
  title,
  copy,
}: {
  title?: string;
  copy?: string;
}) {
  return (
    <div className="marketing-intelligence-flow">
      {(title || copy) && (
        <div className="marketing-section-head marketing-section-head--light mx-auto max-w-3xl text-center">
          {title ? (
            <h2 className="marketing-section-title font-display text-white">{title}</h2>
          ) : null}
          {copy ? <p className="marketing-section-copy text-emerald-100/75">{copy}</p> : null}
        </div>
      )}

      <div className="marketing-intelligence-track" aria-hidden={false}>
        {NODES.map((node, index) => {
          const Icon = node.icon;
          return (
            <div key={node.title} className="marketing-intelligence-node-wrap">
              <article className={`marketing-intelligence-node bg-gradient-to-br ${node.tone}`}>
                <div className="marketing-intelligence-node-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{node.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-emerald-100/70">{node.copy}</p>
              </article>
              {index < NODES.length - 1 ? (
                <ArrowRight className="marketing-intelligence-arrow hidden lg:block" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
