"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { assistant, errorMessage } from "@/lib/api";

type Msg = { role: "user" | "assistant"; text: string; data?: any };

export default function AssistantPage() {
  const [prompt, setPrompt] = useState(
    "How much CO2 will my 50 Neem trees sequester in 10 years?"
  );
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim()) return;
    const userMsg: Msg = { role: "user", text: prompt };
    setHistory((h) => [...h, userMsg]);
    setBusy(true);
    try {
      const ans = await assistant.query(prompt);
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
        Ask about carbon sequestration, species, health, plantation planning, or anything
        BYOT can answer from your data.
      </p>

      <div className="card max-h-[55vh] space-y-3 overflow-y-auto">
        {history.length === 0 && (
          <div className="text-sm text-stone-500">No messages yet.</div>
        )}
        {history.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-forest-600 text-white"
                  : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100")
              }
            >
              {m.text}
              {m.data?.calculations && (
                <pre className="mt-2 max-w-full overflow-x-auto rounded bg-stone-900/70 p-2 text-xs text-stone-100">
                  {JSON.stringify(m.data.calculations, null, 2)}
                </pre>
              )}
              {m.data?.citations?.length > 0 && (
                <div className="mt-1 text-[10px] uppercase tracking-wide opacity-80">
                  Sources: {m.data.citations.join(" · ")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input
          className="input flex-1"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask anything…"
        />
        <button className="btn-primary" disabled={busy}>
          <Send className="h-4 w-4" /> Ask
        </button>
      </form>
    </div>
  );
}
