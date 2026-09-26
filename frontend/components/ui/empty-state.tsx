import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-6 py-12 text-center dark:border-stone-700 dark:bg-stone-900/40",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700 dark:bg-forest-950 dark:text-forest-300">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-stone-600 dark:text-stone-400">{description}</p>
      ) : null}
      {action ? (
        action.href ? (
          <Link href={action.href} className="btn-primary mt-5">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn-primary mt-5" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
