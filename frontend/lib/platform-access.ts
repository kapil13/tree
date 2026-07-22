export type PlatformAccess = {
  website_cms: boolean;
  users_admin: boolean;
};

export function canAccessWebsiteCms(user: { role?: string; platform_access?: PlatformAccess } | null) {
  if (!user) return false;
  return user.platform_access?.website_cms ?? user.role === "admin";
}

export function canManagePlatformUsers(user: { role?: string; platform_access?: PlatformAccess } | null) {
  if (!user) return false;
  return user.platform_access?.users_admin ?? user.role === "admin";
}
