"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function CoverSlide({ total = 20 }: { total?: number }) {
  return (
    <section className="deck-slide deck-slide--cover" data-slide={1} aria-label={`Slide 1 of ${total}`}>
      <div className="deck-cover-wash" />
      <div className="deck-cover-top-rule" />

      <div className="deck-cover-brand">
        <span className="deck-cover-brand-mark" aria-hidden />
        <span>ARANYIX</span>
      </div>

      <main className="deck-cover-copy">
        <div className="deck-cover-eyebrow">Intelligence for a thriving planet</div>
        <h1 className="deck-cover-title">Aranyix — Intelligence for a Thriving Planet</h1>
        <p className="deck-cover-subtitle">
          National MRV platform for plantation programmes, carbon integrity &amp; audit-ready compliance
        </p>
      </main>

      <div className="deck-geo-frame">
        <span className="deck-geo-corner deck-geo-corner--tl" />
        <span className="deck-geo-corner deck-geo-corner--tr" />
        <span className="deck-geo-corner deck-geo-corner--bl" />
        <span className="deck-geo-corner deck-geo-corner--br" />
        <div className="deck-geo-label">SATELLITE / CANOPY LAYER</div>
        <div className="deck-geo-coord">14°38&apos;12.8&quot; N&nbsp;&nbsp;75°02&apos;41.3&quot; E</div>
      </div>
      <div className="deck-scan-line" aria-hidden />

      <div className="deck-audit-badge">
        <div className="deck-audit-title">
          <span className="deck-audit-dot" />
          MRV / VERIFIED
        </div>
        <div className="deck-audit-sub">INDIA + GLOBAL STANDARDS</div>
      </div>

      <div className="deck-cover-footer-meta">
        <span className="deck-meta-green">Plantation</span>
        <span className="deck-meta-divider" />
        <span>Carbon</span>
        <span className="deck-meta-divider" />
        <span>Biodiversity</span>
        <span className="deck-meta-divider" />
        <span className="deck-meta-amber">Compliance</span>
      </div>

      <footer className="deck-footer deck-footer--cover">
        <span className="deck-logo-mark">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Aranyix
        </span>
        <span>1 / {total}</span>
      </footer>
    </section>
  );
}

export function BrowserChrome({
  url,
  children,
  imageSrc,
  imageAlt,
  className,
  glow = "emerald",
}: {
  url: string;
  children?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  glow?: "emerald" | "sky" | "amber";
}) {
  return (
    <div className={cn("deck-browser", `deck-browser--${glow}`, className)}>
      <div className="deck-browser-bar">
        <div className="deck-browser-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="deck-browser-url">{url}</div>
        <div className="deck-browser-live">LIVE</div>
      </div>
      <div className="deck-browser-body">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt ?? "Aranyix portal"}
            width={960}
            height={540}
            className="deck-browser-shot"
            priority={imageSrc.includes("login")}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function SlideSplit({
  eyebrow,
  title,
  copy,
  children,
  reverse,
  variant = "dark",
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  children: ReactNode;
  reverse?: boolean;
  variant?: "dark" | "light";
}) {
  return (
    <div className={cn("deck-split", reverse && "deck-split--reverse", variant === "light" && "deck-split--light")}>
      <div className="deck-split-copy">
        <div className={cn("deck-eyebrow", variant === "light" ? "text-emerald-800" : "text-emerald-300")}>
          {eyebrow}
        </div>
        <h2 className={cn("deck-title mt-2", variant === "light" && "text-stone-900")}>{title}</h2>
        {copy ? (
          <p className={cn("deck-split-lead mt-3", variant === "light" ? "text-stone-600" : "text-emerald-100/75")}>
            {copy}
          </p>
        ) : null}
      </div>
      <div className="deck-split-visual">{children}</div>
    </div>
  );
}

export function MetricRibbon({
  items,
}: {
  items: { label: string; value: string; delta?: string; tone?: "up" | "down" | "neutral" }[];
}) {
  return (
    <div className="deck-metric-ribbon">
      {items.map((item) => (
        <div key={item.label} className="deck-metric-ribbon-item">
          <span className="deck-metric-ribbon-label">{item.label}</span>
          <span className="deck-metric-ribbon-value">{item.value}</span>
          {item.delta ? (
            <span className={cn("deck-metric-ribbon-delta", item.tone && `deck-metric-ribbon-delta--${item.tone}`)}>
              {item.delta}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FlowPipeline({
  steps,
}: {
  steps: { label: string; sub: string; icon?: ReactNode }[];
}) {
  return (
    <div className="deck-flow">
      {steps.map((step, i) => (
        <div key={step.label} className="deck-flow-step-wrap">
          <div className="deck-flow-step">
            <span className="deck-flow-num">{String(i + 1).padStart(2, "0")}</span>
            {step.icon ? <div className="deck-flow-icon">{step.icon}</div> : null}
            <span className="deck-flow-label">{step.label}</span>
            <span className="deck-flow-sub">{step.sub}</span>
          </div>
          {i < steps.length - 1 ? <div className="deck-flow-arrow" aria-hidden /> : null}
        </div>
      ))}
    </div>
  );
}

export function PillRow({ items, highlight }: { items: string[]; highlight?: number[] }) {
  return (
    <div className="deck-pill-row">
      {items.map((item, i) => (
        <span key={item} className={cn("deck-pill-lg", highlight?.includes(i) && "deck-pill-lg--hot")}>
          {item}
        </span>
      ))}
    </div>
  );
}
