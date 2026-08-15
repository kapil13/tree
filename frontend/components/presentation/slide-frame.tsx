"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function SlideFrame({
  children,
  variant = "dark",
  className,
  slideNum,
  total = 26,
}: {
  children: ReactNode;
  variant?: "dark" | "light";
  className?: string;
  slideNum: number;
  total?: number;
}) {
  return (
    <section
      className={cn(
        "deck-slide",
        variant === "dark" ? "deck-slide--dark" : "deck-slide--light",
        className,
      )}
      data-slide={slideNum}
      aria-label={`Slide ${slideNum} of ${total}`}
    >
      <div className={cn("deck-slide-inner", variant === "dark" && "deck-grid-bg")}>{children}</div>
    </section>
  );
}

export function SlideFooter({ slideNum, total = 26 }: { slideNum: number; total?: number }) {
  return (
    <footer className="deck-footer">
      <span className="deck-logo-mark">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        Aranyix
      </span>
      <span>
        {slideNum} / {total}
      </span>
    </footer>
  );
}

export function SlideBullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("mt-3 space-y-1.5", className)}>
      {items.map((item) => (
        <li key={item} className="deck-bullet">
          {item}
        </li>
      ))}
    </ul>
  );
}
