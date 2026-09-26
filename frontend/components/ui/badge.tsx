"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100",
        healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
        moderate: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
        unhealthy: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
        unknown: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
        estimate:
          "bg-amber-100 text-amber-950 uppercase tracking-wide dark:bg-amber-900/40 dark:text-amber-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function healthBadgeVariant(health: string): VariantProps<typeof badgeVariants>["variant"] {
  if (health === "healthy") return "healthy";
  if (health === "moderate") return "moderate";
  if (health === "unhealthy") return "unhealthy";
  return "unknown";
}
