"use client";

import Image from "next/image";
import { Check, Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SlideFooter } from "./slide-frame";

/** Government / boardroom slide shell — white canvas, green accent bar */
export function PptSlide({
  slideNum,
  total,
  section,
  title,
  subtitle,
  children,
  variant = "light",
  className,
  hideFooter,
  compactHeader,
}: {
  slideNum: number;
  total: number;
  section?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant?: "light" | "dark" | "section";
  className?: string;
  hideFooter?: boolean;
  compactHeader?: boolean;
}) {
  return (
    <section
      className={cn(
        "deck-slide ppt-slide",
        variant === "light" && "ppt-slide--light",
        variant === "dark" && "ppt-slide--dark",
        variant === "section" && "ppt-slide--section",
        compactHeader && "ppt-slide--compact-header",
        className,
      )}
      data-slide={slideNum}
      aria-label={`Slide ${slideNum} of ${total}`}
    >
      <div className="ppt-accent-bar" aria-hidden />
      <div className="ppt-inner">
        <header className="ppt-header">
          {section ? <p className="ppt-section-label">{section}</p> : null}
          <h2 className="ppt-title">{title}</h2>
          {subtitle ? <p className="ppt-subtitle">{subtitle}</p> : null}
        </header>
        <div className="ppt-body">{children}</div>
        {!hideFooter ? <SlideFooter slideNum={slideNum} total={total} /> : null}
      </div>
    </section>
  );
}

export function PptTwoCol({
  left,
  right,
  reverse,
  ratio = "1fr 1fr",
}: {
  left: ReactNode;
  right: ReactNode;
  reverse?: boolean;
  ratio?: string;
}) {
  return (
    <div
      className={cn("ppt-two-col", reverse && "ppt-two-col--reverse")}
      style={{ gridTemplateColumns: ratio }}
    >
      <div className="ppt-col ppt-col--text">{left}</div>
      <div className="ppt-col ppt-col--visual">{right}</div>
    </div>
  );
}

export function PptBullets({ items }: { items: string[] }) {
  return (
    <ul className="ppt-bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PptFigure({
  src,
  alt,
  caption,
  objectPosition = "top",
}: {
  src: string;
  alt: string;
  caption: string;
  objectPosition?: "top" | "center";
}) {
  return (
    <figure className="ppt-figure">
      <div className="ppt-figure-frame">
        <Image
          src={src}
          alt={alt}
          width={640}
          height={360}
          className={cn("ppt-figure-img", objectPosition === "center" && "ppt-figure-img--center")}
        />
      </div>
      <figcaption className="ppt-figure-caption">{caption}</figcaption>
    </figure>
  );
}

export function PptKpiRow({ items }: { items: { value: string; label: string; note?: string }[] }) {
  return (
    <div className="ppt-kpi-row">
      {items.map((item) => (
        <div key={item.label} className="ppt-kpi">
          <span className="ppt-kpi-value">{item.value}</span>
          <span className="ppt-kpi-label">{item.label}</span>
          {item.note ? <span className="ppt-kpi-note">{item.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function PptCallout({ title, children, tone = "green" }: { title: string; children: ReactNode; tone?: "green" | "amber" | "neutral" }) {
  return (
    <div className={cn("ppt-callout", `ppt-callout--${tone}`)}>
      <p className="ppt-callout-title">{title}</p>
      <div className="ppt-callout-body">{children}</div>
    </div>
  );
}

export function PptAgenda({ items }: { items: { num: string; title: string; sub: string }[] }) {
  return (
    <div className="ppt-agenda">
      {items.map((item) => (
        <div key={item.num} className="ppt-agenda-item">
          <span className="ppt-agenda-num">{item.num}</span>
          <div>
            <p className="ppt-agenda-title">{item.title}</p>
            <p className="ppt-agenda-sub">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PptTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="ppt-table-wrap">
      <table className="ppt-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={`${row[0]}-${i}`} className={i === 0 ? "font-semibold" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Final thank-you slide — single footer, no duplicate branding */
export function ThankYouSlide({ slideNum, total }: { slideNum: number; total: number }) {
  return (
    <section
      className="deck-slide ppt-slide ppt-slide--thankyou"
      data-slide={slideNum}
      aria-label={`Slide ${slideNum} of ${total}`}
    >
      <div className="ppt-thankyou-bg" aria-hidden />
      <div className="ppt-thankyou-inner">
        <div className="ppt-thankyou-emblem">
          <Leaf className="h-8 w-8 text-emerald-400" aria-hidden />
        </div>
        <p className="ppt-thankyou-eyebrow">Thank you</p>
        <h2 className="ppt-thankyou-title">Evidence you can hand to a regulator, an auditor, or a buyer</h2>
        <p className="ppt-thankyou-sub">
          We welcome the opportunity to scope a pilot on your plantation programme — register trees, run a satellite
          sweep, and deliver a signed evidence bundle mapped to your scheme requirements.
        </p>
        <div className="ppt-thankyou-steps">
          {[
            "Pilot scoping workshop with programme & forest officers",
            "Compliance mapping for MoEFCC / PSU scheme profile",
            "Integration review for GIS, ESG & registry systems",
          ].map((step) => (
            <div key={step} className="ppt-thankyou-step">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="ppt-thankyou-contact">
          <a href="mailto:info@axentis.tech">info@axentis.tech</a>
          <span className="ppt-thankyou-contact-sep">·</span>
          <a href="tel:+919929401306">+91 99294 01306</a>
          <span className="ppt-thankyou-contact-sep">·</span>
          <span>aranyix.tech</span>
        </div>
        <p className="ppt-thankyou-confidential">Confidential — for authorised government and programme stakeholders only</p>
        <SlideFooter slideNum={slideNum} total={total} />
      </div>
    </section>
  );
}
