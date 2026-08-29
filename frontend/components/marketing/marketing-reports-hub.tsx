"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
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

const CATEGORY_NAV: Array<{
  id: ReportCategoryId;
  label: string;
  short: string;
  description: string;
  icon: typeof Leaf;
}> = [
  {
    id: "carbon",
    label: "Carbon & GHG",
    short: "Carbon",
    description: "Land-sector inventories, methane context, carbon stock, and credit ledger exports.",
    icon: Leaf,
  },
  {
    id: "biodiversity",
    label: "Biodiversity & Nature",
    short: "Nature",
    description: "Bioacoustic soundscapes, Darwin Core packs, and biodiversity evidence summaries.",
    icon: Sprout,
  },
  {
    id: "disclosure",
    label: "Climate / ESG / Disclosure",
    short: "Disclosure",
    description: "TNFD, Green Credit, REDD+, Paris/NDC, and voluntary standard disclosures.",
    icon: Trees,
  },
  {
    id: "compliance",
    label: "Compliance / Inventory",
    short: "Compliance",
    description: "BRSR, ISO, ETF/BTR, SBTi FLAG, geo due diligence, and signed evidence bundles.",
    icon: Scale,
  },
];

function actionLabel(action: MarketingReportItem["action"]) {
  if (action === "download") return "Download";
  if (action === "view") return "View";
  return "Generate";
}

function FeaturedStrip({ items }: { items: MarketingReportItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="marketing-reports-featured">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href || "/auth?mode=signin&next=/reports"}
          className="marketing-reports-featured-item"
          style={{ ["--report-accent" as string]: item.accent || "#14532d" }}
        >
          <span>{item.tag}</span>
          <strong>{item.title}</strong>
          <em>{item.formats}</em>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

function ExportRow({ item }: { item: MarketingReportItem }) {
  const ActionIcon = item.action === "download" ? Download : FileText;
  return (
    <div className="marketing-reports-row">
      <div className="marketing-reports-row-main">
        <span className="marketing-reports-row-tag">{item.tag}</span>
        <div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      </div>
      <div className="marketing-reports-row-side">
        <div className="marketing-reports-row-meta">
          <span>{item.formats}</span>
          {item.evidence_hint ? <em>{item.evidence_hint}</em> : null}
          {item.signed ? (
            <span className="marketing-reports-row-signed">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Signed
            </span>
          ) : null}
        </div>
        <Link href={item.href || "/auth?mode=signin&next=/reports"} className="marketing-reports-row-action">
          <ActionIcon className="h-3.5 w-3.5" aria-hidden />
          {actionLabel(item.action)}
        </Link>
      </div>
    </div>
  );
}

export function MarketingReportsHub({ eyebrow, title, copy, content, footerLink }: ReportsHubProps) {
  const items = useMemo(() => normalizeReportItems(content), [content]);
  const [category, setCategory] = useState<ReportCategoryId>("carbon");
  const [query, setQuery] = useState("");

  const activeCategory = CATEGORY_NAV.find((c) => c.id === category) ?? CATEGORY_NAV[0]!;

  const featured = useMemo(() => items.filter((item) => item.featured).slice(0, 3), [items]);

  const categoryItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [items, category, query]);

  const counts = useMemo(() => {
    const map: Partial<Record<ReportCategoryId, number>> = {};
    for (const item of items) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <section id="reports" className="marketing-reports-hub">
      <div className="mx-auto max-w-7xl px-6 py-20">
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

        <FeaturedStrip items={featured} />

        <div className="marketing-reports-catalog">
          <aside className="marketing-reports-sidebar" aria-label="Export categories">
            <p className="marketing-reports-sidebar-label">Evidence streams</p>
            <nav>
              {CATEGORY_NAV.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={category === cat.id ? "is-active" : undefined}
                    onClick={() => setCategory(cat.id)}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span>
                      <strong>{cat.short}</strong>
                      <em>{counts[cat.id] ?? 0} exports</em>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="marketing-reports-panel">
            <header className="marketing-reports-panel-head">
              <div>
                <h3 className="font-display">{activeCategory.label}</h3>
                <p>{activeCategory.description}</p>
              </div>
              <div className="marketing-reports-hub-search">
                <Search className="h-4 w-4" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter this stream…"
                  aria-label="Filter exports"
                />
              </div>
            </header>

            {categoryItems.length === 0 ? (
              <p className="marketing-reports-hub-empty">No exports match your filter in this stream.</p>
            ) : (
              <div className="marketing-reports-list">
                {categoryItems.map((item) => (
                  <ExportRow key={item.title} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>

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
