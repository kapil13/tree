"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ToastOptions = {
  action?: ToastAction;
  undo?: { label: string; onClick: () => void };
  durationMs?: number;
};

type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
  undo?: { label: string; onClick: () => void };
};

let toastId = 0;
let pushToast: ((message: string, options?: ToastOptions) => void) | null = null;

export function showToast(message: string, options?: ToastOptions) {
  pushToast?.(message, options);
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  pushToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = ++toastId;
      setToasts((prev) => [...prev.slice(-3), { id, message, action: options?.action, undo: options?.undo }]);
      window.setTimeout(() => dismiss(id), options?.durationMs ?? 5200);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      pushToast = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] flex max-w-md flex-col gap-2 sm:left-auto sm:right-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <p>{t.message}</p>
          {(t.action || t.undo) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {t.action &&
                (t.action.href ? (
                  <Link
                    href={t.action.href}
                    className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    onClick={() => dismiss(t.id)}
                  >
                    {t.action.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    onClick={() => {
                      t.action?.onClick?.();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                ))}
              {t.undo && (
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
                  onClick={() => {
                    t.undo?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.undo.label}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
