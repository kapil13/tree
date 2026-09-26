"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SeriesTrendChart, type SeriesPoint } from "@/components/dashboard/series-trend-chart";
import type { CommandCenterFocus, CommandCenterSignalId } from "@/lib/command-center-focus";
import { cn } from "@/lib/cn";

export type MrvStage = {
  id: string;
  label: string;
  pct: number;
  status: "done" | "active" | "pending";
  blocked?: boolean;
};

export type ActivityItem = {
  id: string;
  type: "tree" | "alert" | "evidence" | "bio" | "satellite" | "field";
  label: string;
  meta: string;
  time: string;
  href: string;
  at: number;
};

export type OpsBandProps = {
  focus: CommandCenterFocus;
  onZoneSelect: (signalId: CommandCenterSignalId) => void;
  carbon: {
    latestTco2e: number;
    targetTco2e?: number;
    onTrack: boolean;
    series: SeriesPoint[];
    deltaPct: number;
    href: string;
  };
  bio: {
    species: number;
    threatened: number;
    observationsDelta: number;
    chorusPct: number;
    taxonBars: SeriesPoint[];
    href: string;
  };
  mrv: {
    stages: MrvStage[];
    gaps: number;
    blockers: number;
    readinessPct: number;
    href: string;
  };
  activity: ActivityItem[];
};

function OpsZone({
  label,
  active,
  onClick,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("cc-ops-zone", active && "cc-ops-zone--active", className)}
      onClick={onClick}
    >
      <div className="cc-ops-zone-label">{label}</div>
      {children}
    </button>
  );
}

export function CommandCenterOpsBand({
  focus,
  onZoneSelect,
  carbon,
  bio,
  mrv,
  activity,
}: OpsBandProps) {
  const te = useTranslations("executive");

  const mrvBarTotal = mrv.stages.reduce((sum, stage) => sum + stage.pct, 0) || 1;

  return (
    <section className="cc-ops-band" aria-label={te("opsBand")}>
      <OpsZone
        label={te("opsCarbon")}
        active={focus.signalId === "carbon"}
        onClick={() => onZoneSelect("carbon")}
        className="cc-ops-zone--carbon"
      >
        <div className="cc-ops-carbon-head">
          <span className="cc-ops-carbon-val">{carbon.latestTco2e} t</span>
          {carbon.targetTco2e != null ? (
            <span className="cc-ops-carbon-target">
              / {carbon.targetTco2e} t
            </span>
          ) : null}
          <span
            className={cn(
              "cc-ops-carbon-track",
              carbon.onTrack ? "cc-ops-carbon-track--on" : "cc-ops-carbon-track--off",
            )}
          >
            {carbon.onTrack ? te("carbonOnTrack") : te("carbonOffTrack")}
          </span>
        </div>
        <SeriesTrendChart
          data={carbon.series}
          color="#15803d"
          height={80}
          target={carbon.targetTco2e}
          valueFormatter={(v) => `${v} t`}
        />
        <Link href={carbon.href} className="cc-ops-zone-link">
          {te("carbonStockTrend")} →
        </Link>
      </OpsZone>

      <OpsZone
        label={te("opsBiodiversity")}
        active={focus.signalId === "bio"}
        onClick={() => onZoneSelect("bio")}
      >
        <div className="cc-ops-bio-visual">
          <div>
            <span className="cc-ops-bio-big">{bio.species}</span>
            <span className="cc-ops-bio-unit"> {te("speciesMix")}</span>
          </div>
          <div className="cc-ops-bio-stats">
            {bio.observationsDelta > 0 ? (
              <span className="cc-ops-bio-stat">
                +{bio.observationsDelta} {te("bioObservations")}
              </span>
            ) : null}
            <span className={cn("cc-ops-bio-stat", bio.threatened > 0 && "cc-ops-bio-stat--warn")}>
              {bio.threatened} {te("threatened")}
            </span>
            <span className="cc-ops-bio-stat">
              {te("signalBioChorus")} {bio.chorusPct}%
            </span>
          </div>
        </div>
        {bio.taxonBars.length > 0 ? (
          <div className="cc-ops-bio-chart">
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={bio.taxonBars} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 8 }} stroke="#94a3b8" interval={0} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 10 }} />
                <Bar dataKey="value" fill="#5c7a6e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <Link href={bio.href} className="cc-ops-zone-link">
          {te("recordBiodiversity")} →
        </Link>
      </OpsZone>

      <OpsZone
        label={te("opsMrv")}
        active={focus.signalId === "mrv"}
        onClick={() => onZoneSelect("mrv")}
      >
        <div className="cc-ops-mrv-flow">
          {mrv.stages.map((stage, index) => (
            <div key={stage.id} className="cc-ops-mrv-step-wrap">
              <div
                className={cn(
                  "cc-ops-mrv-step",
                  stage.status === "active" && "cc-ops-mrv-step--active",
                  stage.blocked && "cc-ops-mrv-step--blocked",
                )}
              >
                <span className="cc-ops-mrv-pct">{stage.pct}%</span>
                <span className="cc-ops-mrv-name">{stage.label}</span>
              </div>
              {index < mrv.stages.length - 1 ? (
                <span className="cc-ops-mrv-arrow" aria-hidden>→</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="cc-ops-mrv-bar">
          {mrv.stages.map((stage) => (
            <div
              key={`${stage.id}-bar`}
              className={cn("cc-ops-mrv-bar-seg", `cc-ops-mrv-bar-seg--${stage.status}`)}
              style={{ width: `${(stage.pct / mrvBarTotal) * 100}%` }}
            />
          ))}
        </div>
        <div className="cc-ops-mrv-issues">
          <span className="cc-ops-mrv-gap">
            {te("mrvGaps", { count: mrv.gaps })}
          </span>
          <span className="cc-ops-mrv-block">
            {te("mrvBlockers", { count: mrv.blockers })}
          </span>
          <span className="cc-ops-mrv-ready">{fmtPct(mrv.readinessPct)} {te("signalMrvReady")}</span>
        </div>
        <Link href={mrv.href} className="cc-ops-zone-link">
          {te("portfolioCompliance")} →
        </Link>
      </OpsZone>

      <OpsZone
        label={te("opsActivity")}
        active={focus.signalId === "alerts"}
        onClick={() => onZoneSelect("alerts")}
        className="cc-ops-zone--activity"
      >
        <div className="cc-ops-activity-stream">
          {activity.length === 0 ? (
            <p className="cc-ops-activity-empty">{te("opsActivityEmpty")}</p>
          ) : (
            activity.map((item) => (
              <Link key={item.id} href={item.href} className="cc-ops-act-item">
                <span className={cn("cc-ops-act-dot", `cc-ops-act-dot--${item.type}`)} />
                <div className="cc-ops-act-body">
                  <p className="cc-ops-act-label">{item.label}</p>
                  <p className="cc-ops-act-meta">{item.meta}</p>
                </div>
                <span className="cc-ops-act-time">{item.time}</span>
              </Link>
            ))
          )}
        </div>
      </OpsZone>
    </section>
  );
}

function fmtPct(value: number) {
  return `${value.toFixed(1)}%`;
}
