"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/cn";

export function StepUpModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  busy,
  showReadOnlyOption,
  danger = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  showReadOnlyOption?: boolean;
  /** Use for destructive confirms (revoke, suspend, reject). */
  danger?: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason?: string, readOnly?: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) {
      setPassword("");
      setReason("");
      setReadOnly(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const handleClose = () => {
    if (busy) return;
    setPassword("");
    setReason("");
    setReadOnly(true);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="card w-full max-w-md shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              danger
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
            )}
          >
            {danger ? <AlertTriangle className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </span>
          <div>
            <h3 id={titleId} className="text-lg font-semibold">
              {title}
            </h3>
            <p id={descId} className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="kpi-label" htmlFor="step-up-password">
              Your password
            </label>
            <input
              id="step-up-password"
              type="password"
              className="input mt-1"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password && !busy) {
                  onConfirm(password, reason || undefined, readOnly);
                }
              }}
              placeholder="Re-enter your admin password"
            />
          </div>
          {title.toLowerCase().includes("impersonat") && (
            <div>
              <label className="kpi-label" htmlFor="step-up-reason">
                Reason (optional)
              </label>
              <input
                id="step-up-reason"
                className="input mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Support ticket #, customer request…"
              />
            </div>
          )}
          {showReadOnlyOption && (
            <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnly(e.target.checked)}
              />
              Read-only mode (block writes while impersonating)
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? "btn-primary bg-rose-700 hover:bg-rose-800" : "btn-primary"}
            disabled={!password || busy}
            onClick={() => onConfirm(password, reason || undefined, readOnly)}
          >
            {busy ? "Confirming…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
