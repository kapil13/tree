"use client";

import type { BulkApprovePreviewRow } from "@/lib/bulk-program-access-preview";

type Props = {
  open: boolean;
  action: "approve" | "reject";
  rows: BulkApprovePreviewRow[];
  onClose: () => void;
  onConfirm: () => void;
};

export function BulkProgramAccessPreviewModal({
  open,
  action,
  rows,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  const isApprove = action === "approve";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          {isApprove ? "Confirm bulk approval" : "Confirm bulk rejection"}
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          {isApprove
            ? "Bulk approve creates a new organization per request using the profile below (or an auto-generated name). Use single-item approve to link an existing org."
            : "The selected requests will be rejected with the same outcome as individual reject."}
        </p>

        <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((row) => (
            <li key={row.id} className="py-3 text-sm">
              <div className="font-medium">{row.userName}</div>
              <div className="text-xs text-stone-500">{row.userEmail}</div>
              {isApprove ? (
                <div className="mt-1 text-xs text-stone-600 dark:text-stone-300">
                  {row.programName} → org <span className="font-medium">{row.orgName}</span> (
                  {row.platformRole}, org admin)
                </div>
              ) : (
                <div className="mt-1 text-xs text-stone-600 dark:text-stone-300">
                  {row.programName}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={isApprove ? "btn-primary" : "btn-secondary text-rose-700"}
            onClick={onConfirm}
          >
            Continue to password confirm
          </button>
        </div>
      </div>
    </div>
  );
}
