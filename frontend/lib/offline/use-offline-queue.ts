"use client";

import { useCallback, useEffect, useState } from "react";
import { pendingTreeRegistrationCount } from "@/lib/offline/tree-registration-queue";
import { syncQueuedTreeRegistrations } from "@/lib/offline/tree-registration-sync";

export function useOfflineTreeQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setPendingCount(await pendingTreeRegistrationCount());
  }, []);

  useEffect(() => {
    void refresh();
    const onOnline = () => {
      void refresh();
      void syncQueuedTreeRegistrations().then(() => refresh());
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await syncQueuedTreeRegistrations();
      setLastSynced(count);
      await refresh();
      return count;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  return { pendingCount, syncing, lastSynced, refresh, syncNow };
}
