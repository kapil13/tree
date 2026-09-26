import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import type { LegalDocument } from "@/lib/content/legal";

/** Same plain-text rendering the CMS legal body uses, without a client fetch. */
export function LegalPlainBody({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-stone-700">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-3xl font-semibold tracking-tight text-forest-900">
              {trimmed.slice(2)}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-8 text-xl font-semibold text-forest-900">
              {trimmed.slice(3)}
            </h2>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      <main className="pt-8">
        <article className="mx-auto max-w-3xl px-6 py-16">
          <LegalPlainBody text={document.body} />
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
