"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, Send, Lightbulb, AlertTriangle, Brain } from "lucide-react";
import { useTranslations } from "next-intl";
import { InsightPanel, OperationalStatusBar, PageHeader } from "@/components/ui";
import { assistant, errorMessage, type AssistantAnswer } from "@/lib/api";

type Msg = {
  role: "user" | "assistant";
  text: string;
  data?: AssistantAnswer;
};

const SUGGESTION_KEYS = [
  "suggestion1",
  "suggestion2",
  "suggestion3",
  "suggestion4",
  "suggestion5",
  "suggestion6",
] as const;

const HIDDEN_CALC_KEYS = new Set(["intent", "mode", "portfolio", "provider", "llm_error"]);

function visibleCalculations(calculations?: Record<string, unknown>) {
  if (!calculations) return null;
  const entries = Object.entries(calculations).filter(([key]) => !HIDDEN_CALC_KEYS.has(key));
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderAnswerText(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className="my-1.5 list-disc space-y-1 pl-5">
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]!);
      return;
    }
    flushList(`list-${idx}`);
    if (line.trim() === "") {
      blocks.push(<div key={`br-${idx}`} className="h-2" />);
      return;
    }
    blocks.push(
      <p key={`p-${idx}`} className="m-0">
        {renderInlineMarkdown(line)}
      </p>,
    );
  });
  flushList("list-end");
  return <div className="space-y-0.5">{blocks}</div>;
}

function providerLabel(data: AssistantAnswer | undefined, ta: ReturnType<typeof useTranslations<"assistant">>) {
  if (!data) return null;
  if (data.mode === "llm" && data.provider === "openai") return ta("providerOpenai");
  if (data.mode === "llm" && data.provider === "gemini") return ta("providerGemini");
  return ta("providerRules");
}

export default function AssistantPage() {
  const ta = useTranslations("assistant");
  const tc = useTranslations("chrome");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [lastMode, setLastMode] = useState<AssistantAnswer["mode"] | null>(null);
  const [lastLlmError, setLastLlmError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, busy]);

  async function ask(e?: React.FormEvent, text?: string) {
    e?.preventDefault();
    const question = (text ?? prompt).trim();
    if (!question) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: "Type a question or tap a suggestion above, then press Ask.",
        },
      ]);
      return;
    }
    const userMsg: Msg = { role: "user", text: question };
    setHistory((h) => [...h, userMsg]);
    setBusy(true);
    try {
      const ans = await assistant.query(question);
      setLastMode(ans.mode ?? "rules");
      setLastLlmError(ans.llm_error ?? null);
      setHistory((h) => [...h, { role: "assistant", text: ans.answer, data: ans }]);
      setPrompt("");
    } catch (err) {
      setHistory((h) => [...h, { role: "assistant", text: errorMessage(err) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <PageHeader
        className="mb-4"
        purpose={ta("purpose")}
        title={ta("title")}
        description={ta("description")}
        breadcrumbs={[{ label: tc("sectionIntelligence") }, { label: tc("breadcrumbAssistant") }]}
      />

      <OperationalStatusBar
        tone={lastMode === "rules" && lastLlmError ? "attention" : lastMode === "llm" ? "healthy" : "neutral"}
        label={lastLlmError ? ta("opsLlmError") : ta("opsReady")}
        summary={lastLlmError ? ta("opsLlmErrorSummary") : ta("opsReadySummary")}
        icon={Brain}
      />

      <InsightPanel
        title={ta("suggestedQuestions")}
        interpretation={ta("welcome")}
        icon={Sparkles}
      >
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="rounded-full border border-forest-200 bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-800 transition hover:bg-forest-100 disabled:opacity-50 dark:border-forest-800 dark:bg-forest-950/40 dark:text-forest-100"
              onClick={() => void ask(undefined, ta(key))}
              disabled={busy}
            >
              {ta(key)}
            </button>
          ))}
        </div>
      </InsightPanel>

      {lastMode === "rules" && lastLlmError ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Live LLM unavailable — using portfolio rules engine</p>
            <p className="mt-0.5 text-xs text-amber-900/80">{lastLlmError}</p>
          </div>
        </div>
      ) : null}

      <div className="card min-h-0 flex-1 space-y-3 overflow-y-auto pb-28">
        {history.length === 0 && (
          <div className="flex items-start gap-2 text-sm text-stone-500">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{ta("welcome")}</span>
          </div>
        )}
        {history.map((m, i) => {
          const metrics = m.role === "assistant" ? visibleCalculations(m.data?.calculations) : null;
          const citations = m.data?.citations?.filter((c) => c.toLowerCase() !== "aranyix assistant");
          const source = m.role === "assistant" ? providerLabel(m.data, ta) : null;

          return (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm " +
                  (m.role === "user"
                    ? "bg-forest-600 text-white"
                    : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100")
                }
              >
                {m.role === "assistant" ? renderAnswerText(m.text) : m.text}
                {metrics && (
                  <details className="mt-3 rounded-lg border border-stone-200/80 bg-white/70 p-2 text-xs dark:border-stone-700 dark:bg-stone-900/50">
                    <summary className="cursor-pointer font-medium text-stone-600">
                      Technical details (JSON)
                    </summary>
                    <pre className="mt-2 max-w-full overflow-x-auto text-[11px] text-stone-700 dark:text-stone-200">
                      {JSON.stringify(metrics, null, 2)}
                    </pre>
                  </details>
                )}
                {(source || (citations && citations.length > 0)) && (
                  <div className="mt-2 text-[10px] uppercase tracking-wide opacity-70">
                    {[source, citations && citations.length > 0 ? `Sources: ${citations.join(" · ")}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="text-left">
            <div className="inline-block rounded-2xl bg-stone-100 px-4 py-2 text-sm text-stone-500 dark:bg-stone-800">
              {ta("thinking")}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => void ask(e)}
        className="sticky bottom-0 z-10 -mx-1 mt-auto border-t border-stone-200 bg-white/95 px-1 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
      >
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={ta("placeholder")}
            disabled={busy}
          />
          <button
            type="submit"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
          >
            <Send className="h-4 w-4" /> {busy ? ta("thinking") : ta("send")}
          </button>
        </div>
      </form>
    </div>
  );
}
