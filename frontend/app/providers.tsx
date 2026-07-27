"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SessionCookieSync } from "@/components/session-cookie-sync";

let appQueryClient: QueryClient | null = null;

export function getAppQueryClient() {
  return appQueryClient;
}

export function clearAppQueryCache() {
  appQueryClient?.clear();
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
    });
    appQueryClient = qc;
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <SessionCookieSync />
      {children}
    </QueryClientProvider>
  );
}
