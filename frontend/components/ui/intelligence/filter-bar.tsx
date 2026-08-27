import { cn } from "@/lib/cn";

export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("intel-filter-bar", className)} role="search">
      {children}
    </div>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("intel-filter-field", className)}>
      <label htmlFor={htmlFor} className="intel-filter-label">
        {label}
      </label>
      {children}
    </div>
  );
}
