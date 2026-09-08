"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { TreesMap } from "@/components/trees-map";
import { cn } from "@/lib/cn";

export type CommandCenterPriority = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warn" | "info";
  signals?: string[];
  sla?: string;
};

export type CommandCenterHeroProps = {
  integrityScore: number;
  integrityTrend?: "up" | "down" | "flat" | null;
  primarySignal: string;
  cascade: Array<{ label: string; active?: boolean }>;
  metrics: Array<{
    label: string;
    value: string | number;
    tone?: "default" | "warn" | "critical";
  }>;
  priorities: CommandCenterPriority[];
  primaryActionHref: string;
  primaryActionLabel: string;
};

const SEVERITY_LABEL: Record<CommandCenterPriority["tone"], string> = {
  critical: "CRITICAL",
  warn: "HIGH",
  info: "MEDIUM",
};

export function CommandCenterHero({
  integrityScore,
  integrityTrend,
  primarySignal,
  cascade,
  metrics,
  priorities,
  primaryActionHref,
  primaryActionLabel,
}: CommandCenterHeroProps) {
  const te = useTranslations("executive");
  const [selectedId, setSelectedId] = useState<string | null>(priorities[0]?.id ?? null);

  const selected = priorities.find((p) => p.id === selectedId) ?? priorities[0];
  const actionHref = selected?.href ?? primaryActionHref;
  const actionLabel = selected?.title ?? primaryActionLabel;

  return (
    <section className="cc-hero" aria-label={te("commandCenterHero")}>
      <div className="cc-hero-grid">
        <aside className="cc-hero-state" aria-label={te("portfolioState")}>
          <div className="cc-integrity">
            <div className="cc-integrity-row">
              <span className="cc-integrity-score">{integrityScore}</span>
              {integrityTrend && integrityTrend !== "flat" ? (
                <span
                  className={cn(
                    "cc-integrity-delta",
                    integrityTrend === "down" && "cc-integrity-delta--down",
                    integrityTrend === "up" && "cc-integrity-delta--up",
                  )}
                >
                  {integrityTrend === "down" ? "↓" : "↑"}
                </span>
              ) : null}
            </div>
            <p className="cc-integrity-label">{te("forestIntegrity")}</p>
          </div>

          <div className="cc-primary-signal">
            <span className="cc-primary-tag">{te("primarySignal")}</span>
            <p className="cc-primary-text">{primarySignal}</p>
          </div>

          {cascade.length > 0 ? (
            <div className="cc-cascade" aria-label={te("signalCascade")}>
              {cascade.map((step, i) => (
                <div key={`${step.label}-${i}`}>
                  {i > 0 ? <span className="cc-cascade-arrow" aria-hidden>↓</span> : null}
                  <p className={cn("cc-cascade-step", step.active && "cc-cascade-step--active")}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <dl className="cc-state-metrics">
            {metrics.map((m) => (
              <div key={m.label} className="cc-state-metric">
                <dt className="cc-state-metric-label">{m.label}</dt>
                <dd
                  className={cn(
                    "cc-state-metric-value",
                    m.tone === "warn" && "cc-state-metric-value--warn",
                    m.tone === "critical" && "cc-state-metric-value--critical",
                  )}
                >
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>

        <div className="cc-hero-map" aria-label={te("liveForestMap")}>
          <div className="cc-hero-map-frame">
            <TreesMap height="100%" mapType="hybrid" showFilters className="cc-hero-map-inner" />
          </div>
          <Link href="/map" className="cc-hero-map-link">
            {te("openMap")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <aside className="cc-hero-priority" aria-label={te("priorityAction")}>
          <div className="cc-priority-head">
            <h2 className="cc-priority-title">{te("priorityAction")}</h2>
            <Link href="/alerts" className="cc-priority-all">
              {te("allAlerts")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="cc-priority-stack">
            {priorities.length === 0 ? (
              <p className="cc-priority-empty">{te("noPriorities")}</p>
            ) : (
              priorities.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "cc-priority-block",
                    `cc-priority-block--${item.tone}`,
                    selectedId === item.id && "cc-priority-block--selected",
                  )}
                  onClick={() => setSelectedId(item.id)}
                >
                  <p className="cc-priority-sev">{SEVERITY_LABEL[item.tone]}</p>
                  <div className="cc-priority-body">
                    <p className="cc-priority-name">{item.title}</p>
                    {item.signals && item.signals.length > 0 ? (
                      <div className="cc-priority-signals">
                        {item.signals.map((sig) => (
                          <span key={sig} className="cc-priority-sig">{sig}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="cc-priority-detail">{item.detail}</p>
                    )}
                    {item.sla ? (
                      <p className={cn("cc-priority-sla", item.sla === "Overdue" && "cc-priority-sla--overdue")}>
                        {item.sla}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>

          <Link href={actionHref} className="cc-action-primary">
            {actionLabel}
          </Link>
        </aside>
      </div>
    </section>
  );
}
