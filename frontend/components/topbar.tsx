"use client";

import { Bell, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { NavLinks } from "@/components/sidebar";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-950 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm text-stone-600">
            {user?.organization_id ? "Organization view" : "Personal view"}
            {process.env.NEXT_PUBLIC_BUILD_SHA ? (
              <span className="ml-2 hidden text-xs text-stone-400 sm:inline" title="Deployed frontend build">
                · {process.env.NEXT_PUBLIC_BUILD_SHA}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <div className="hidden text-sm sm:block">
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

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white p-4 shadow-xl dark:bg-stone-950">
            <div className="mb-4 flex items-center justify-between">
              <Link
                href="/dashboard"
                className="text-lg font-bold text-forest-800"
                onClick={() => setMenuOpen(false)}
              >
                🌳 BYOT
              </Link>
              <button type="button" className="btn-ghost" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
