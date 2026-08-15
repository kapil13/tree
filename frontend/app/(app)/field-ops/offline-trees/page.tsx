"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CloudOff, TreePine, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

export default function OfflineTreesPage() {
  const { user } = useAuth();
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  const treesQ = useQuery({
    queryKey: scopedKey(user, "offline-trees"),
    queryFn: () => trees.list({ page_size: 50 }),
    staleTime: 60_000,
  });

  const items = treesQ.data?.items ?? [];
  const isOfflineCache = !online || treesQ.isError;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <PageHeader
        title="Offline tree list"
        description="Supervisor PWA cache — last synced tree registry when connectivity is limited."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {online ? <Wifi className="h-4 w-4 text-forest-600" /> : <CloudOff className="h-4 w-4 text-amber-600" />}
              {online ? "Online" : "Offline mode"}
            </CardTitle>
            <Badge variant={online ? "healthy" : "moderate"}>{online ? "Connected" : "Cached data"}</Badge>
          </div>
          <CardDescription>
            Install this app from your browser menu for quick field access. Tree list responses are cached by the service worker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {treesQ.isLoading ? (
            <p className="text-sm text-stone-500">Loading tree list…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-stone-500">
              No trees cached yet. Visit while online to populate the offline list.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Carbon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tree) => (
                  <TableRow key={tree.id}>
                    <TableCell>
                      <Link href={`/trees/${tree.id}`} className="font-mono text-xs text-forest-700 hover:underline">
                        {tree.public_code}
                      </Link>
                    </TableCell>
                    <TableCell>{tree.species_text ?? "—"}</TableCell>
                    <TableCell>{tree.current_health ?? "unknown"}</TableCell>
                    <TableCell>
                      {tree.current_carbon_kg > 0 ? `~${tree.current_carbon_kg.toFixed(1)} kg C` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {isOfflineCache && items.length > 0 ? (
            <p className="mt-3 text-xs text-amber-800">
              Showing {items.length} cached trees{!online ? " (offline)" : ""}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-forest-700 hover:underline">
        <TreePine className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
