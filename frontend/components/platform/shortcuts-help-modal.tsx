"use client";

import type { PlatformHotkey } from "@/lib/use-platform-hotkeys";
import { getGlobalHotkeys } from "@/lib/use-platform-hotkeys";

type Props = {
  open: boolean;
  onClose: () => void;
  pageHotkeys?: PlatformHotkey[];
};

function HotkeyRow({ keys, description }: PlatformHotkey) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{description}</span>
      <kbd className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
        {keys}
      </kbd>
    </div>
  );
}

export function ShortcutsHelpModal({ open, onClose, pageHotkeys = [] }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            Esc
          </button>
        </div>

        {pageHotkeys.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">This page</h3>
            {pageHotkeys.map((hk) => (
              <HotkeyRow key={hk.keys + hk.description} {...hk} />
            ))}
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</h3>
          {getGlobalHotkeys().map((hk) => (
            <HotkeyRow key={hk.keys + hk.description} {...hk} />
          ))}
        </section>

        <p className="mt-4 text-xs text-slate-500">
          Press <kbd className="rounded border px-1 font-mono">?</kbd> anytime to open this panel.
        </p>
      </div>
    </div>
  );
}
