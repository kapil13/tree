"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileText,
  Leaf,
  Scale,
  Search,
  ShieldCheck,
  Sprout,
  Trees,
} from "lucide-react";
import {
  normalizeReportItems,
  type MarketingReportItem,
  type ReportCategoryId,
} from "@/lib/marketing-home-data";

type ReportsHubProps = {
  eyebrow?: string;
  title?: string;
  copy?: string;
  content: Record<string, unknown>;
  footerLink?: { label?: string; href?: string };
};

const STREAM_META: Array<{
  id: ReportCategoryId;
  icon: typeof Leaf;
  tone: string;
}> = [
  { id: "carbon", icon: Leaf, tone: "#15803d" },
  { id: "biodiversity", icon: Sprout, tone: "#0d9488" },
  { id: "disclosure", icon: Trees, tone: "#4d7c0f" },
  { id: "compliance", icon: Scale, tone: "#1e3a5f" },
];

const PREVIEW_COUNT = 3;

type StreamConfig = {
  id: ReportCategoryId;
  label: string;
  headline: string;
  description: string;
  icon: typeof Leaf;
  tone: string;
};

function ExportLink({
  item,
  actionLabels,
  signedLabel,
}: {
  item: MarketingReportItem;
  actionLabels: { generate: string; download: string; view: string };
  signedLabel: string;
}) {
  const ActionIcon = item.action === "download" ? Download : FileText;
  const action =
    item.action === "download" ? actionLabels.download : item.action === "view" ? actionLabels.view : actionLabels.generate;

  return (
    <Link
      href={item.href || "/auth?mode=signin&next=/reports"}
      className="marketing-reports-export-link"
      style={{ ["--stream-accent" as string]: item.accent || "#14532d" }}
    >
      <span className="marketing-reports-export-link-tag">{item.tag}</span>
      <span className="marketing-reports-export-link-title">{item.title}</span>
      <span className="marketing-reports-export-link-meta">
        {item.formats}
        {item.signed ? (
          <>
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {signedLabel}
          </>
        ) : null}
      </span>
      <span className="marketing-reports-export-link-action">
        <ActionIcon className="h-3.5 w-3.5" aria-hidden />
        {action}
      </span>
    </Link>
  );
}

function StreamPanel({
  stream,
  items,
  expanded,
  onToggle,
  actionLabels,
  signedLabel,
  showFewerLabel,
  viewAllLabel,
  exportCountLabel,
}: {
  stream: StreamConfig;
  items: MarketingReportItem[];
  expanded: boolean;
  onToggle: () => void;
  actionLabels: { generate: string; download: string; view: string };
  signedLabel: string;
  showFewerLabel: string;
  viewAllLabel: string;
  exportCountLabel: string;
}) {
  const Icon = stream.icon;
  const preview = items.slice(0, PREVIEW_COUNT);
  const rest = items.slice(PREVIEW_COUNT);
  const hiddenCount = rest.length;

  return (
    <article
      className={`marketing-reports-stream${expanded ? " is-expanded" : ""}`}
      style={{ ["--stream-tone" as string]: stream.tone }}
    >
      <header className="marketing-reports-stream-head">
        <div className="marketing-reports-stream-icon" aria-hidden>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="marketing-reports-stream-label">{stream.label}</p>
          <h3 className="font-display">{stream.headline}</h3>
          <p>{stream.description}</p>
        </div>
        <span className="marketing-reports-stream-count">{exportCountLabel}</span>
      </header>

      <div className="marketing-reports-stream-list">
        {(expanded ? items : preview).map((item) => (
          <ExportLink key={item.title} item={item} actionLabels={actionLabels} signedLabel={signedLabel} />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <button type="button" className="marketing-reports-stream-toggle" onClick={onToggle}>
          {expanded ? showFewerLabel : viewAllLabel}
          <ChevronDown className={`h-4 w-4${expanded ? " is-flipped" : ""}`} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}

export function MarketingReportsHub({ eyebrow, title, copy, content, footerLink }: ReportsHubProps) {
  const t = useTranslations("marketing.home.reports");
  const items = useMemo(() => normalizeReportItems(content), [content]);
  const [query, setQuery] = useState("");
  const [expandedStream, setExpandedStream] = useState<ReportCategoryId | null>(null);

  const streams = useMemo<StreamConfig[]>(
    () =>
      STREAM_META.map((meta) => ({
        ...meta,
        label: t(`streams.${meta.id}.label`),
        headline: t(`streams.${meta.id}.headline`),
        description: t(`streams.${meta.id}.description`),
      })),
    [t],
  );

  const actionLabels = useMemo(
    () => ({
      generate: t("actionGenerate"),
      download: t("actionDownload"),
      view: t("actionView"),
    }),
    [t],
  );

  const q = query.trim().toLowerCase();

  const filteredByStream = useMemo(() => {
    const map: Record<ReportCategoryId, MarketingReportItem[]> = {
      carbon: [],
      biodiversity: [],
      disclosure: [],
      compliance: [],
      all: [],
    };
    for (const item of items) {
      if (q) {
        const haystack = `${item.title} ${item.tag} ${item.description}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      map[item.category]?.push(item);
    }
    return map;
  }, [items, q]);

  const visibleStreams = streams.filter((stream) => (filteredByStream[stream.id]?.length ?? 0) > 0);
  const totalVisible = visibleStreams.reduce((sum, stream) => sum + (filteredByStream[stream.id]?.length ?? 0), 0);
  const signedCount = items.filter((item) => item.signed).length;

  return (
    <section id="reports" className="marketing-reports-hub">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="marketing-reports-hub-top">
          <div className="marketing-reports-hub-headline">
            <p className="marketing-eyebrow">{eyebrow || "Reports"}</p>
            <h2 className="marketing-section-title font-display">
              {title || "Sixteen live exports. One evidence graph."}
            </h2>
            <p className="marketing-section-copy">
              {copy ||
                "One plantation record powers every export — browse by evidence stream, then generate assurance packs in the workspace."}
            </p>
          </div>

          <dl className="marketing-reports-stats" aria-label={t("statsAria")}>
            <div>
              <dt>{t("liveExports")}</dt>
              <dd>{items.length}</dd>
            </div>
            <div>
              <dt>{t("evidenceStreams")}</dt>
              <dd>4</dd>
            </div>
            <div>
              <dt>{t("signedBundles")}</dt>
              <dd>{signedCount}</dd>
            </div>
            <div>
              <dt>{t("sourceRecord")}</dt>
              <dd>{t("sourceGraph")}</dd>
            </div>
          </dl>
        </div>

        <div className="marketing-reports-hub-toolbar">
          <p>{t("toolbarHint")}</p>
          <div className="marketing-reports-hub-search">
            <Search className="h-4 w-4" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAria")}
            />
          </div>
        </div>

        {totalVisible === 0 ? (
          <p className="marketing-reports-hub-empty">{t("empty")}</p>
        ) : (
          <div className="marketing-reports-streams">
            {visibleStreams.map((stream) => {
              const streamItems = filteredByStream[stream.id] ?? [];
              return (
                <StreamPanel
                  key={stream.id}
                  stream={stream}
                  items={streamItems}
                  expanded={expandedStream === stream.id}
                  onToggle={() => setExpandedStream((current) => (current === stream.id ? null : stream.id))}
                  actionLabels={actionLabels}
                  signedLabel={t("signed")}
                  showFewerLabel={t("showFewer")}
                  viewAllLabel={t("viewAllExports", { count: streamItems.length })}
                  exportCountLabel={t("exportCount", { count: streamItems.length })}
                />
              );
            })}
          </div>
        )}

        {footerLink?.label && footerLink.href ? (
          <p className="marketing-reports-footer">
            <Link href={footerLink.href} className="marketing-reports-footer-link">
              {footerLink.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
