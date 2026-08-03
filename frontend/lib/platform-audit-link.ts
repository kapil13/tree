/** Build deep-links into the platform audit log with pre-filled filters. */

export type PlatformAuditLinkParams = {
  action?: string;
  actionPrefix?: string;
  search?: string;
  actorUserId?: string;
};

export function buildPlatformAuditUrl(params: PlatformAuditLinkParams = {}): string {
  const q = new URLSearchParams();
  if (params.action) q.set("action", params.action);
  if (params.actionPrefix) q.set("action_prefix", params.actionPrefix);
  if (params.search) q.set("search", params.search);
  if (params.actorUserId) q.set("actor_user_id", params.actorUserId);
  const query = q.toString();
  return `/platform/audit${query ? `?${query}` : ""}`;
}

export function auditLinkForAction(action: string, search?: string): string {
  if (action.includes("*")) {
    return buildPlatformAuditUrl({ actionPrefix: action.replace("*", "") });
  }
  return buildPlatformAuditUrl({ actionPrefix: action.endsWith(".") ? action : `${action}.` });
}
