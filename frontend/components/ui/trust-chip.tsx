import { cn } from "@/lib/cn";

type TrustTone = "live" | "stub" | "estimate" | "ok" | "warn" | "error";

const STYLES: Record<TrustTone, string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  stub: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  estimate: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function TrustChip({
  tone,
  label,
  className,
}: {
  tone: TrustTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STYLES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function trustToneFromProvider(provider?: string | null): {
  tone: TrustTone;
  label: string;
} {
  if (!provider) return { tone: "warn", label: "Unknown" };
  const p = provider.toLowerCase();
  if (p.includes("stub") || p.includes("estimate") || p.includes("simulated") || p.includes("demo")) {
    return { tone: "stub", label: "Stub / estimate" };
  }
  return { tone: "live", label: "Live data" };
}
