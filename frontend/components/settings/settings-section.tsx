import { cn } from "@/lib/cn";

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
        {description ? <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
