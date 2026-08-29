"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ReportPreviewArt } from "@/components/marketing/marketing-visuals";
import {
  normalizeReportItems,
  REPORT_CATEGORIES,
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

function actionLabel(action: MarketingReportItem["action"]) {
  if (action === "download") return "Download";
  if (action === "view") return "View";
  return "Generate";
}

function ReportCard({ item, compact }: { item: MarketingReportItem; compact?: boolean }) {
  const ActionIcon = item.action === "download" ? Download : FileText;
  return (
    <article
      className={`marketing-report-hub-card${item.featured ? " marketing-report-hub-card--featured" : ""}${compact ? " marketing-report-hub-card--compact" : ""}`}
      style={{ ["--report-accent" as string]: item.accent || "#14532d" }}
    >
      <div className="marketing-report-hub-card-preview">
        <div className="marketing-report-hub-sheet">
          <span>{item.tag}</span>
          <ReportPreviewArt tag={item.tag} title={item.title} />
        </div>
      </div>
      <div className="marketing-report-hub-card-body">
        <div className="marketing-report-hub-card-meta">
          <span className="marketing-report-hub-tag">{item.tag}</span>
          <span className={`marketing-report-hub-status marketing-report-hub-status--${item.status || "live"}`}>
            {item.status === "beta" ? "Beta" : "Live export"}
          </span>
          {item.signed ? (
            <span className="marketing-report-hub-signed">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Signed
            </span>
          ) : null}
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="marketing-report-hub-card-foot">
          <div className="marketing-report-hub-card-evidence">
            <span>{item.formats}</span>
            {item.evidence_hint ? <em>{item.evidence_hint}</em> : null}
          </div>
          <Link href={item.href || "/auth?mode=signin&next=/reports"} className="marketing-report-hub-action">
            <ActionIcon className="h-3.5 w-3.5" aria-hidden />
            {actionLabel(item.action)}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MarketingReportsHub({ eyebrow, title, copy, content, footerLink }: ReportsHubProps) {
  const items = useMemo(() => normalizeReportItems(content), [content]);
  const [category, setCategory] = useState<ReportCategoryId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const categoryOk = category === "all" || item.category === category;
      if (!categoryOk) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [items, category, query]);

  const featured = filtered.filter((item) => item.featured);
  const regular = filtered.filter((item) => !item.featured);
  const counts = useMemo(() => {
    const map: Partial<Record<ReportCategoryId, number>> = { all: items.length };
    for (const item of items) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <section id="reports" className="marketing-reports-hub">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="marketing-reports-hub-head">
          <div className="marketing-reports-hub-intro">
            <p className="marketing-eyebrow">{eyebrow || "Reports"}</p>
            <h2 className="marketing-section-title font-display">{title || "Sixteen live exports. One evidence graph."}</h2>
            <p className="marketing-section-copy">
              {copy ||
                "Framework-mapped assurance packs generated from the same plantation record — carbon, biodiversity, disclosure, and compliance exports for auditors and program officers."}
            </p>
          </div>
          <div className="marketing-reports-hub-stats" aria-label="Export summary">
            <div>
              <strong>{items.length}</strong>
              <span>Live export types</span>
            </div>
            <div>
              <strong>1</strong>
              <span>Evidence graph</span>
            </div>
            <div>
              <strong>
                <BadgeCheck className="inline h-4 w-4 text-emerald-600" aria-hidden />
              </strong>
              <span>Assurance packs, not credit issuance</span>
            </div>
          </div>
        </div>

        <div className="marketing-reports-hub-toolbar">
          <div className="marketing-reports-hub-search">
            <Search className="h-4 w-4" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports by name, framework, or keyword…"
              aria-label="Search reports"
            />
          </div>
          <div className="marketing-reports-hub-filters" role="tablist" aria-label="Report categories">
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={category === cat.id}
                className={category === cat.id ? "is-active" : undefined}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
                {cat.id !== "all" && counts[cat.id] ? (
                  <span className="marketing-reports-hub-filter-count">{counts[cat.id]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="marketing-reports-hub-empty">No reports match your search. Try another category or keyword.</p>
        ) : (
          <div className="marketing-reports-hub-grid">
            {featured.length > 0 ? (
              <div className="marketing-reports-hub-featured">
                <p className="marketing-reports-hub-section-label">Primary exports</p>
                <div className="marketing-reports-hub-featured-grid">
                  {featured.map((item) => (
                    <ReportCard key={item.title} item={item} />
                  ))}
                </div>
              </div>
            ) : null}
            {regular.length > 0 ? (
              <div className="marketing-reports-hub-regular">
                {featured.length > 0 ? (
                  <p className="marketing-reports-hub-section-label">Supporting exports</p>
                ) : null}
                <div className="marketing-reports-hub-regular-grid">
                  {regular.map((item) => (
                    <ReportCard key={item.title} item={item} compact />
                  ))}
                </div>
              </div>
            ) : null}
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
