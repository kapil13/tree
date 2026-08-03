/** Build deep-links into the platform audit log with pre-filled filters. */

export type PlatformAuditLinkParams = {
  action?: string;
  actionPrefix?: string;
  search?: string;
  actorUserId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
};

export function buildPlatformAuditUrl(params: PlatformAuditLinkParams = {}): string {
  const q = new URLSearchParams();
  if (params.action) q.set("action", params.action);
  if (params.actionPrefix) q.set("action_prefix", params.actionPrefix);
  if (params.search) q.set("search", params.search);
  if (params.actorUserId) q.set("actor_user_id", params.actorUserId);
  if (params.organizationId) q.set("organization_id", params.organizationId);
  if (params.resourceType) q.set("resource_type", params.resourceType);
  if (params.resourceId) q.set("resource_id", params.resourceId);
  const query = q.toString();
  return `/platform/audit${query ? `?${query}` : ""}`;
}

export function auditLinkForAction(action: string, search?: string): string {
  if (action.includes("*")) {
    return buildPlatformAuditUrl({ actionPrefix: action.replace("*", "") });
  }
  return buildPlatformAuditUrl({ actionPrefix: action.endsWith(".") ? action : `${action}.` });
}
