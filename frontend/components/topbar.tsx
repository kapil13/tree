"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { auth } from "@/lib/api";

export function Topbar() {
  const router = useRouter();
  const { user, setUser, logout, access } = useAuth();

  useEffect(() => {
    if (!access) {
      router.replace("/login");
      return;
    }
    if (!user) {
      auth.me().then(setUser).catch(() => logout());
    }
  }, [access, user, router, setUser, logout]);

  return (
    <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-6 dark:border-stone-800 dark:bg-stone-950">
      <div className="text-sm text-stone-600">
        {user?.organization_id ? "Organization view" : "Personal view"}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-ghost" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="text-sm">
          <div className="font-medium text-stone-800 dark:text-stone-100">{user?.full_name || "…"}</div>
          <div className="text-xs text-stone-500">{user?.role}</div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
