import { showToast } from "@/components/toast";
import { errorMessage } from "@/lib/api";
import { buildPlatformAuditUrl, type PlatformAuditLinkParams } from "@/lib/platform-audit-link";

export function notifyPlatformError(err: unknown) {
  showToast(errorMessage(err));
}

export function notifyPlatformAction(
  message: string,
  options?: {
    audit?: PlatformAuditLinkParams | string;
    undo?: { label?: string; onUndo: () => void };
    durationMs?: number;
  },
) {
  const auditHref =
    typeof options?.audit === "string"
      ? options.audit
      : options?.audit
        ? buildPlatformAuditUrl(options.audit)
        : undefined;

  showToast(message, {
    durationMs: options?.durationMs ?? 4500,
    action: auditHref
      ? { label: "View audit", href: auditHref }
      : undefined,
    undo: options?.undo
      ? { label: options.undo.label ?? "Undo", onClick: options.undo.onUndo }
      : undefined,
  });
}
