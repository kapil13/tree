"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

const STREAMS: Array<{
  id: ReportCategoryId;
  label: string;
  headline: string;
  description: string;
  icon: typeof Leaf;
  tone: string;
}> = [
  {
    id: "carbon",
    label: "Carbon & GHG",
    headline: "Land-sector inventories, methane fusion, and credit ledgers",
    description: "GHG Protocol, TROPOMI context, VM0047 ledger, and ISO 14064-1 org roll-ups.",
    icon: Leaf,
    tone: "#15803d",
  },
  {
    id: "biodiversity",
    label: "Biodiversity & Nature",
    headline: "Soundscapes, species evidence, and habitat narratives",
    description: "Bioacoustic engine outputs, Darwin Core packs, and TNFD-ready nature summaries.",
    icon: Sprout,
    tone: "#0d9488",
  },
  {
    id: "disclosure",
    label: "Climate / ESG / Disclosure",
    headline: "Voluntary standards and national programme packs",
    description: "TNFD LEAP, Green Credit India, REDD+, Paris traceability, and Gold Standard LUF.",
    icon: Trees,
    tone: "#4d7c0f",
  },
  {
    id: "compliance",
    label: "Compliance / Inventory",
    headline: "Assurance, inventory handoff, and signed evidence",
    description: "BRSR, ISO 14064-2, ETF/BTR, SBTi FLAG, EUDR geo packs, and Ed25519 bundles.",
    icon: Scale,
    tone: "#1e3a5f",
  },
];

const PREVIEW_COUNT = 3;

function actionLabel(action: MarketingReportItem["action"]) {
  if (action === "download") return "Download";
  if (action === "view") return "View";
  return "Generate";
}

function ExportLink({ item }: { item: MarketingReportItem }) {
  const ActionIcon = item.action === "download" ? Download : FileText;
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
            Signed
          </>
        ) : null}
      </span>
      <span className="marketing-reports-export-link-action">
        <ActionIcon className="h-3.5 w-3.5" aria-hidden />
        {actionLabel(item.action)}
      </span>
    </Link>
  );
}

function StreamPanel({
  stream,
  items,
  expanded,
  onToggle,
}: {
  stream: (typeof STREAMS)[number];
  items: MarketingReportItem[];
  expanded: boolean;
  onToggle: () => void;
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
        <span className="marketing-reports-stream-count">{items.length} exports</span>
      </header>

      <div className="marketing-reports-stream-list">
        {(expanded ? items : preview).map((item) => (
          <ExportLink key={item.title} item={item} />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <button type="button" className="marketing-reports-stream-toggle" onClick={onToggle}>
          {expanded ? "Show fewer" : `View all ${items.length} exports`}
          <ChevronDown className={`h-4 w-4${expanded ? " is-flipped" : ""}`} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}

export function MarketingReportsHub({ eyebrow, title, copy, content, footerLink }: ReportsHubProps) {
  const items = useMemo(() => normalizeReportItems(content), [content]);
  const [query, setQuery] = useState("");
  const [expandedStream, setExpandedStream] = useState<ReportCategoryId | null>(null);

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

  const visibleStreams = STREAMS.filter((stream) => (filteredByStream[stream.id]?.length ?? 0) > 0);
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

          <dl className="marketing-reports-stats" aria-label="Export catalog summary">
            <div>
              <dt>Live exports</dt>
              <dd>{items.length}</dd>
            </div>
            <div>
              <dt>Evidence streams</dt>
              <dd>4</dd>
            </div>
            <div>
              <dt>Signed bundles</dt>
              <dd>{signedCount}</dd>
            </div>
            <div>
              <dt>Source record</dt>
              <dd>1 graph</dd>
            </div>
          </dl>
        </div>

        <div className="marketing-reports-hub-toolbar">
          <p>Browse by stream — expand any lane for the full catalog.</p>
          <div className="marketing-reports-hub-search">
            <Search className="h-4 w-4" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exports…"
              aria-label="Search exports"
            />
          </div>
        </div>

        {totalVisible === 0 ? (
          <p className="marketing-reports-hub-empty">No exports match your search.</p>
        ) : (
          <div className="marketing-reports-streams">
            {visibleStreams.map((stream) => (
              <StreamPanel
                key={stream.id}
                stream={stream}
                items={filteredByStream[stream.id] ?? []}
                expanded={expandedStream === stream.id}
                onToggle={() => setExpandedStream((current) => (current === stream.id ? null : stream.id))}
              />
            ))}
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
