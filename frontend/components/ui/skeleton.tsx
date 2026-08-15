"use client";

import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-stone-200/80 dark:bg-stone-800/80", className)}
      {...props}
    />
  );
}

export function DashboardSkeletonShell() {
  return (
    <div className="dash-shell mx-auto max-w-6xl space-y-6">
      <Skeleton className="dash-hero h-44 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
