"use client";

import { useState } from "react";
import { Sparkles, Send, Lightbulb } from "lucide-react";
import { assistant, errorMessage } from "@/lib/api";

type Msg = {
  role: "user" | "assistant";
  text: string;
  data?: {
    calculations?: Record<string, unknown>;
    citations?: string[];
  };
};

const SUGGESTIONS = [
  "Give me a portfolio summary",
  "What is the health status of my trees?",
  "How much CO₂ are my trees storing?",
  "How many species were detected in bioacoustic recordings?",
  "What satellite verification coverage do I have?",
  "Any unread alerts I should know about?",
];

const HIDDEN_CALC_KEYS = new Set(["intent", "mode", "portfolio"]);

function visibleCalculations(calculations?: Record<string, unknown>) {
  if (!calculations) return null;
  const entries = Object.entries(calculations).filter(([key]) => !HIDDEN_CALC_KEYS.has(key));
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}

function renderAnswerText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);

  async function ask(e?: React.FormEvent, text?: string) {
    e?.preventDefault();
    const question = (text ?? prompt).trim();
    if (!question) return;
    const userMsg: Msg = { role: "user", text: question };
    setHistory((h) => [...h, userMsg]);
    setBusy(true);
    try {
      const ans = await assistant.query(question);
      setHistory((h) => [
        ...h,
        { role: "assistant", text: ans.answer, data: ans },
      ]);
      setPrompt("");
    } catch (err) {
      setHistory((h) => [...h, { role: "assistant", text: errorMessage(err) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Sparkles className="h-6 w-6 text-forest-700" /> AI assistant
      </h1>
      <p className="text-sm text-stone-600">
        Ask about your live portfolio — carbon, health, satellite NDVI, biodiversity,
        alerts, and species recommendations. Answers use your registered data.
      </p>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-forest-200 bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-800 transition hover:bg-forest-100"
            onClick={() => ask(undefined, s)}
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card max-h-[55vh] space-y-3 overflow-y-auto">
        {history.length === 0 && (
          <div className="flex items-start gap-2 text-sm text-stone-500">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>Pick a suggestion above or ask your own question about your plantation data.</span>
          </div>
        )}
        {history.map((m, i) => {
          const metrics = m.role === "assistant" ? visibleCalculations(m.data?.calculations) : null;
          const citations = m.data?.citations?.filter((c) => c.toLowerCase() !== "aranyix assistant");

          return (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap text-left " +
                  (m.role === "user"
                    ? "bg-forest-600 text-white"
                    : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100")
                }
              >
                {m.role === "assistant" ? renderAnswerText(m.text) : m.text}
                {metrics && (
                  <details className="mt-3 rounded-lg border border-stone-200/80 bg-white/70 p-2 text-xs dark:border-stone-700 dark:bg-stone-900/50">
                    <summary className="cursor-pointer font-medium text-stone-600">
                      View metrics
                    </summary>
                    <pre className="mt-2 max-w-full overflow-x-auto text-[11px] text-stone-700 dark:text-stone-200">
                      {JSON.stringify(metrics, null, 2)}
                    </pre>
                  </details>
                )}
                {citations && citations.length > 0 && (
                  <div className="mt-2 text-[10px] uppercase tracking-wide opacity-70">
                    Sources: {citations.join(" · ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input
          className="input flex-1"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about your trees, carbon, health, satellite, biodiversity…"
          disabled={busy}
        />
        <button className="btn-primary" disabled={busy || !prompt.trim()}>
          <Send className="h-4 w-4" /> {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
