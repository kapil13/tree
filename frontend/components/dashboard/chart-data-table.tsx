"use client";

type ChartDataTableProps = {
  caption: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
  id?: string;
};

/** Screen-reader / keyboard-accessible alternative to Recharts visuals (WCAG 1.1.1). */
export function ChartDataTable({ caption, columns, rows, id = "chart-data-table" }: ChartDataTableProps) {
  if (!rows.length) return null;
  return (
    <details className="mt-3 rounded-lg border border-stone-200 bg-stone-50/80 p-3 text-sm dark:border-stone-700 dark:bg-stone-900/40">
      <summary className="cursor-pointer font-medium text-stone-700 dark:text-stone-200">{caption}</summary>
      <div className="mt-2 max-h-48 overflow-auto">
        <table className="min-w-full text-left text-xs" id={id}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-2 py-1 font-semibold text-stone-600">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-stone-200 dark:border-stone-700">
                {columns.map((col) => (
                  <td key={col.key} className="px-2 py-1 text-stone-800 dark:text-stone-100">
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
