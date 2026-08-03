export type PlatformAccess = {
  website_cms: boolean;
  users_admin: boolean;
  program_access_admin: boolean;
  billing_admin: boolean;
  ops_admin: boolean;
};

type PlatformUser = { role?: string; platform_access?: Partial<PlatformAccess> } | null;

function hasModule(user: PlatformUser, key: keyof PlatformAccess) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.platform_access?.[key] === true;
}

export function isFullPlatformAdmin(user: PlatformUser) {
  return user?.role === "admin";
}

export function canAccessWebsiteCms(user: PlatformUser) {
  return hasModule(user, "website_cms");
}

export function canManagePlatformUsers(user: PlatformUser) {
  return hasModule(user, "users_admin");
}

export function canManageProgramAccess(user: PlatformUser) {
  return hasModule(user, "program_access_admin");
}

export function canAccessBillingAdmin(user: PlatformUser) {
  return hasModule(user, "billing_admin");
}

export function canAccessOpsAdmin(user: PlatformUser) {
  return hasModule(user, "ops_admin");
}

export function hasAnyPlatformAccess(user: PlatformUser) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const access = user.platform_access;
  if (!access) return false;
  return Object.values(access).some(Boolean);
}

export function canAccessPlatformPath(user: PlatformUser, pathname: string) {
  if (!user) return false;
  if (pathname.startsWith("/platform/cms")) {
    return canAccessWebsiteCms(user);
  }
  if (pathname === "/platform" || pathname === "/platform/") {
    return hasAnyPlatformAccess(user);
  }
  if (pathname.startsWith("/platform/users") || pathname.startsWith("/platform/organizations")) {
    return canManagePlatformUsers(user);
  }
  if (pathname.startsWith("/platform/audit")) {
    return canManagePlatformUsers(user);
  }
  if (pathname.startsWith("/platform/program-access")) {
    return canManageProgramAccess(user);
  }
  if (pathname.startsWith("/platform/governance")) {
    return isFullPlatformAdmin(user);
  }
  if (pathname.startsWith("/platform/roles")) {
    return hasAnyPlatformAccess(user);
  }
  if (pathname.startsWith("/platform/billing")) {
    return canAccessBillingAdmin(user);
  }
  if (pathname.startsWith("/platform/ops")) {
    return canAccessOpsAdmin(user);
  }
  if (pathname.startsWith("/platform")) {
    return hasAnyPlatformAccess(user);
  }
  return false;
}
