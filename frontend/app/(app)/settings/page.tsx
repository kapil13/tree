"use client";

import { useAuth } from "@/lib/auth-store";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="card space-y-2">
        <div className="text-sm text-stone-600">Profile</div>
        <pre className="overflow-x-auto rounded bg-stone-900/80 p-3 text-xs text-stone-100">
{JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  );
}
