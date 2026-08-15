"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SlideBullets, SlideFooter, SlideFrame } from "./slide-frame";

export function ScreenshotHero({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="deck-shot-hero">
      <Image src={src} alt={alt} fill className="deck-shot-img" priority={priority} sizes="1280px" />
      <div className="deck-shot-vignette" aria-hidden />
    </div>
  );
}

export function VisualSlide({
  slideNum,
  total,
  variant = "dark",
  eyebrow,
  title,
  subtitle,
  screenshot,
  screenshotAlt,
  stats,
  bullets,
  children,
  footerNote,
}: {
  slideNum: number;
  total: number;
  variant?: "dark" | "light";
  eyebrow: string;
  title: string;
  subtitle?: string;
  screenshot?: string;
  screenshotAlt?: string;
  stats?: { label: string; value: string; accent?: string }[];
  bullets?: string[];
  children?: ReactNode;
  footerNote?: string;
}) {
  if (screenshot) {
    return (
      <FullBleedSlide
        slideNum={slideNum}
        total={total}
        screenshot={screenshot}
        screenshotAlt={screenshotAlt}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      >
        <div className="w-full space-y-2">
          {stats?.length ? (
            <div className="deck-glass-panel deck-glass-panel--row">
              {stats.map((s) => (
                <div key={s.label} className="deck-glass-stat">
                  <span className="deck-stat-value text-emerald-300">{s.value}</span>
                  <span className="deck-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          {bullets?.length ? (
            <div className="deck-glass-panel">
              <ul className="deck-overlay-bullets">
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </FullBleedSlide>
    );
  }

  return (
    <SlideFrame slideNum={slideNum} variant={variant} className="deck-slide--visual">
      <div className="deck-visual-head">
        <div className={cn("deck-eyebrow", variant === "light" ? "text-emerald-700" : "text-emerald-300")}>
          {eyebrow}
        </div>
        <h2 className={cn("deck-title deck-title--compact mt-1", variant === "light" && "text-stone-900")}>
          {title}
        </h2>
        {subtitle ? (
          <p className={cn("deck-visual-sub", variant === "light" ? "text-stone-600" : "text-emerald-100/80")}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="deck-visual-body">{children}</div>
      {footerNote ? <p className="deck-visual-note">{footerNote}</p> : null}
      <SlideFooter slideNum={slideNum} total={total} />
    </SlideFrame>
  );
}

export function SplitVisualSlide({
  slideNum,
  total,
  variant = "dark",
  eyebrow,
  title,
  subtitle,
  screenshot,
  screenshotAlt,
  children,
  reverse,
}: {
  slideNum: number;
  total: number;
  variant?: "dark" | "light";
  eyebrow: string;
  title: string;
  subtitle?: string;
  screenshot: string;
  screenshotAlt?: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <SlideFrame slideNum={slideNum} variant={variant} className="deck-slide--visual">
      <div className={cn("deck-split-visual-full", reverse && "deck-split-visual-full--reverse")}>
        <div className="deck-split-visual-copy">
          <div className={cn("deck-eyebrow", variant === "light" ? "text-emerald-700" : "text-emerald-300")}>
            {eyebrow}
          </div>
          <h2 className={cn("deck-title mt-1", variant === "light" && "text-stone-900")}>{title}</h2>
          {subtitle ? (
            <p className={cn("deck-split-sub mt-2", variant === "light" ? "text-stone-600" : "text-emerald-100/75")}>
              {subtitle}
            </p>
          ) : null}
          <div className="deck-split-infographic mt-3">{children}</div>
        </div>
        <div className="deck-split-visual-shot">
          <ScreenshotHero src={screenshot} alt={screenshotAlt ?? title} />
        </div>
      </div>
      <SlideFooter slideNum={slideNum} total={total} />
    </SlideFrame>
  );
}

export function InfographicSlide({
  slideNum,
  total,
  variant = "dark",
  eyebrow,
  title,
  subtitle,
  children,
}: {
  slideNum: number;
  total: number;
  variant?: "dark" | "light";
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SlideFrame slideNum={slideNum} variant={variant} className="deck-slide--infographic">
      <div className="deck-infographic-head">
        <div className={cn("deck-eyebrow", variant === "light" ? "text-emerald-700" : "text-emerald-300")}>
          {eyebrow}
        </div>
        <h2 className={cn("deck-title mt-1", variant === "light" && "text-stone-900")}>{title}</h2>
        {subtitle ? (
          <p className={cn("deck-infographic-sub", variant === "light" ? "text-stone-600" : "text-emerald-100/75")}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="deck-infographic-body">{children}</div>
      <SlideFooter slideNum={slideNum} total={total} />
    </SlideFrame>
  );
}

export function FullBleedSlide({
  slideNum,
  total,
  screenshot,
  screenshotAlt,
  eyebrow,
  title,
  subtitle,
  children,
  position = "top",
}: {
  slideNum: number;
  total: number;
  screenshot: string;
  screenshotAlt?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  position?: "top" | "center";
}) {
  return (
    <SlideFrame slideNum={slideNum} variant="dark" className="deck-slide--fullbleed">
      <div className="deck-fullbleed-wrap">
        <Image
          src={screenshot}
          alt={screenshotAlt ?? title}
          fill
          className={cn("deck-fullbleed-img", position === "center" && "deck-fullbleed-img--center")}
          sizes="1280px"
          priority={slideNum <= 8}
        />
        <div className="deck-fullbleed-scrim" aria-hidden />
        <div className="deck-fullbleed-content">
          <div className="deck-fullbleed-head">
            <div className="deck-eyebrow text-emerald-300">{eyebrow}</div>
            <h2 className="deck-title deck-title--compact mt-1 text-white">{title}</h2>
            {subtitle ? <p className="deck-fullbleed-sub">{subtitle}</p> : null}
          </div>
          <div className="deck-fullbleed-body">{children}</div>
        </div>
      </div>
      <SlideFooter slideNum={slideNum} total={total} />
    </SlideFrame>
  );
}

export function DenseBullets({ items, columns = 2 }: { items: string[]; columns?: 2 | 3 }) {
  return (
    <SlideBullets
      items={items}
      className={cn("deck-dense-bullets", columns === 3 && "deck-dense-bullets--3")}
    />
  );
}
