"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string };

let toastId = 0;
const listeners = new Set<(t: Toast) => void>();

export function showToast(message: string) {
  const toast = { id: ++toastId, message };
  listeners.forEach((fn) => fn(toast));
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onToast = (t: Toast) => {
      setItems((prev) => [...prev.slice(-3), t]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 2800);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={cn(
            "pointer-events-auto max-w-sm rounded-xl border border-stone-200 bg-stone-900 px-4 py-2.5",
            "text-sm text-white shadow-lg",
          )}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </button>
      ))}
    </div>,
    document.body,
  );
}
