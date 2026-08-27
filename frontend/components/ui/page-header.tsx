import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type Breadcrumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  purpose,
  breadcrumbs,
  status,
  actions,
  className,
}: {
  title: string;
  description?: string;
  /** One-line operational purpose shown above the title (who/why). */
  purpose?: string;
  breadcrumbs?: Breadcrumb[];
  /** STATUS layer — operational banner or health strip. */
  status?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 space-y-4", className)}>
      {status}
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3 w-3 opacity-60" /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-forest-700">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-stone-700 dark:text-stone-300">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {purpose ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{purpose}</p>
          ) : null}
          <h1
            className={cn(
              "font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl",
              purpose && "mt-1",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
