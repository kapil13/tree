export function isPlatformAdmin(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperadmin(role?: string | null): boolean {
  return role === "superadmin";
}
