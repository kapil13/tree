"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { MarketingMegaMenu } from "@/lib/marketing-nav";
import { cn } from "@/lib/cn";

function navHref(href: string, onAuth: boolean) {
  return onAuth && href.startsWith("#") ? `/${href}` : href;
}

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0] || "/";
  if (path === "/") return pathname === "/" && !href.includes("#");
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function MarketingMegaMenuDesktop({
  items,
  onAuth,
}: {
  items: MarketingMegaMenu[];
  onAuth: boolean;
}) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenId(null);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="hidden items-center gap-0.5 lg:flex">
      {items.map((item) => {
        if (item.href && !item.columns) {
          const href = navHref(item.href, onAuth);
          const active = isActive(pathname ?? "", item.href);
          return (
            <Link
              key={item.id}
              href={href}
              className={cn(
                "marketing-nav-link",
                active && "bg-forest-50 text-forest-800",
                item.id === "contact" && "font-semibold text-forest-700",
              )}
            >
              {item.label}
            </Link>
          );
        }

        const open = openId === item.id;
        return (
          <div key={item.id} className="relative">
            <button
              type="button"
              className={cn(
                "marketing-nav-link inline-flex items-center gap-1",
                open && "bg-forest-50 text-forest-800",
              )}
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpenId(open ? null : item.id)}
            >
              {item.label}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
            </button>

            {open ? (
              <div className="marketing-mega-panel absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[min(42rem,calc(100vw-3rem))]">
                {item.featured ? (
                  <Link
                    href={navHref(item.featured.href, onAuth)}
                    className="marketing-mega-featured"
                    onClick={() => setOpenId(null)}
                  >
                    <span className="font-semibold text-forest-900">{item.featured.label}</span>
                    {item.featured.description ? (
                      <span className="mt-1 block text-sm text-stone-600">{item.featured.description}</span>
                    ) : null}
                  </Link>
                ) : null}
                <div className="grid gap-6 p-5 sm:grid-cols-2">
                  {item.columns?.map((column) => (
                    <div key={column.title}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {column.title}
                      </p>
                      <ul className="mt-3 space-y-1">
                        {column.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={navHref(link.href, onAuth)}
                              className="block rounded-lg px-2 py-1.5 text-sm text-stone-700 transition hover:bg-forest-50 hover:text-forest-800"
                              onClick={() => setOpenId(null)}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function MarketingMegaMenuMobile({
  items,
  onAuth,
  onNavigate,
}: {
  items: MarketingMegaMenu[];
  onAuth: boolean;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        if (item.href && !item.columns) {
          return (
            <Link
              key={item.id}
              href={navHref(item.href, onAuth)}
              className="rounded-xl px-3 py-3 text-base font-medium text-stone-700 transition hover:bg-forest-50 hover:text-forest-800"
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          );
        }

        const isOpen = expanded === item.id;
        return (
          <div key={item.id} className="rounded-xl border border-stone-100 bg-stone-50/60">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-3 text-left text-base font-semibold text-stone-800"
              aria-expanded={isOpen}
              onClick={() => setExpanded(isOpen ? null : item.id)}
            >
              {item.label}
              <ChevronDown className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <div className="space-y-4 border-t border-stone-100 px-3 pb-3 pt-2">
                {item.featured ? (
                  <Link
                    href={navHref(item.featured.href, onAuth)}
                    className="block rounded-lg bg-white px-3 py-2 text-sm font-medium text-forest-800 shadow-sm"
                    onClick={onNavigate}
                  >
                    {item.featured.label}
                  </Link>
                ) : null}
                {item.columns?.map((column) => (
                  <div key={column.title}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {column.title}
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={navHref(link.href, onAuth)}
                            className="block rounded-lg px-2 py-2 text-sm text-stone-700 hover:bg-white"
                            onClick={onNavigate}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
