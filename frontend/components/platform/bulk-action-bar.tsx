"use client";

export function BulkActionBar({
  selectedCount,
  children,
  onClear,
}: {
  selectedCount: number;
  children: React.ReactNode;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-forest-900 dark:bg-forest-950/40">
      <span className="font-medium text-forest-900 dark:text-forest-100">
        {selectedCount} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button type="button" className="btn-ghost self-start text-xs sm:self-auto" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}
