"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AlertsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await api.get("/v1/alerts")).data as any[],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <div className="card divide-y divide-stone-100">
        {isLoading && <div className="text-stone-500">Loading…</div>}
        {data?.length === 0 && (
          <div className="text-sm text-stone-500">No alerts. Your trees are happy.</div>
        )}
        {data?.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-stone-600">{a.message}</div>
              <div className="mt-1 text-xs text-stone-500">
                {a.kind} · {a.severity} · {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
            {!a.is_read && <span className="badge-moderate">unread</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
