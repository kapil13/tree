"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SectionNavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  badge?: number | string;
};

export function SectionNav({
  items,
  active,
  onSelect,
  ariaLabel,
  className,
}: {
  items: SectionNavItem[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("intel-section-nav", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn("intel-section-nav-item", isActive && "intel-section-nav-item-active")}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
            {item.badge != null && Number(item.badge) > 0 ? (
              <span className="intel-section-nav-badge">{item.badge}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
