"use client";

import { cn } from "@/lib/cn";

export function PortfolioKpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}
