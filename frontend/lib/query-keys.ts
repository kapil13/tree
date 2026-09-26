import type { User } from "@/lib/api";

/** Prefix React Query keys with the signed-in user so accounts never share cached data. */
export function scopedKey(user: User | null | undefined, ...parts: readonly unknown[]) {
  return ["user", user?.id ?? "anon", ...parts] as const;
}
