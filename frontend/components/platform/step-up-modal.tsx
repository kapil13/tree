"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

export function StepUpModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  busy,
  showReadOnlyOption,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  showReadOnlyOption?: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason?: string, readOnly?: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [readOnly, setReadOnly] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-2xl" role="dialog" aria-labelledby="step-up-title">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h3 id="step-up-title" className="text-lg font-semibold">
              {title}
            </h3>
            <p className="mt-1 text-sm text-stone-600">{description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="kpi-label">Your password</label>
            <input
              type="password"
              className="input mt-1"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Re-enter your admin password"
            />
          </div>
          {title.toLowerCase().includes("impersonat") && (
            <div>
              <label className="kpi-label">Reason (optional)</label>
              <input
                className="input mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Support ticket #, customer request…"
              />
            </div>
          )}
          {showReadOnlyOption && (
            <label className="flex items-center gap-2 text-sm text-stone-600">
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
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
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
