"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

export function OrgSuspendModal({
  open,
  orgName,
  suspending,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orgName: string;
  suspending: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason?: string, revokeMemberSessions?: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setReason("");
      setRevokeSessions(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        className="card w-full max-w-md shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-status-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={
              suspending
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"
            }
          >
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h3 id="org-status-title" className="text-lg font-semibold">
              {suspending ? `Suspend ${orgName}` : `Reactivate ${orgName}`}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {suspending
                ? "Members will be blocked from signing in until the organization is reactivated."
                : "Members will regain access immediately. Confirm with your password."}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {suspending ? (
            <>
              <div>
                <label className="kpi-label">Reason (optional)</label>
                <input
                  className="input mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Support ticket, billing issue…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={revokeSessions}
                  onChange={(e) => setRevokeSessions(e.target.checked)}
                />
                Revoke all member sessions immediately
              </label>
            </>
          ) : null}
          <div>
            <label className="kpi-label">Your password</label>
            <input
              type="password"
              className="input mt-1"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={suspending ? "btn-primary bg-rose-700 hover:bg-rose-800" : "btn-primary"}
            disabled={!password || busy}
            onClick={() =>
              onConfirm(password, reason || undefined, suspending ? revokeSessions : false)
            }
          >
            {busy
              ? "Saving…"
              : suspending
                ? "Suspend organization"
                : "Reactivate organization"}
          </button>
        </div>
      </div>
    </div>
  );
}
