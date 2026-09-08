"use client";

import { useTranslations } from "next-intl";
import type { CommandCenterSignalId } from "@/lib/command-center-focus";
import { cn } from "@/lib/cn";

export type SignalCell = {
  id: CommandCenterSignalId;
  value: string;
  label: string;
  tone?: "up" | "down" | "warn" | null;
};

export function CommandCenterSignalRibbon({
  signals,
  activeSignalId,
  onSignalSelect,
}: {
  signals: SignalCell[];
  activeSignalId: CommandCenterSignalId | null;
  onSignalSelect: (id: CommandCenterSignalId) => void;
}) {
  const te = useTranslations("executive");

  return (
    <section className="cc-signal-ribbon" aria-label={te("signalRibbon")}>
      {signals.map((signal) => (
        <button
          key={signal.id}
          type="button"
          className={cn(
            "cc-signal-cell",
            activeSignalId === signal.id && "cc-signal-cell--highlight",
          )}
          onClick={() => onSignalSelect(signal.id)}
          aria-pressed={activeSignalId === signal.id}
        >
          <span
            className={cn(
              "cc-sig-val",
              signal.tone === "down" && "cc-sig-val--down",
              signal.tone === "up" && "cc-sig-val--up",
              signal.tone === "warn" && "cc-sig-val--warn",
            )}
          >
            {signal.value}
          </span>
          <span className="cc-sig-lbl">{signal.label}</span>
        </button>
      ))}
    </section>
  );
}
