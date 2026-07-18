import Link from "next/link";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import { Leaf } from "lucide-react";

const FOOTER_LINKS = {
  Platform: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/auth?mode=signup", label: "Register a tree" },
    { href: "/docs", label: "API documentation" },
  ],
  Programs: [
    { href: "/auth?mode=signup", label: "BYOT citizen tagging" },
    { href: "/auth?mode=signup", label: "Government & NHAI" },
    { href: "/auth?mode=signup", label: "Corporate ESG" },
    { href: "/auth?mode=signup", label: "NGO & community" },
  ],
  Company: [
    { href: "#compliance", label: "Compliance frameworks" },
    { href: "#how-it-works", label: "How it works" },
    { href: "/auth?mode=signin", label: "Sign in" },
  ],
};

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="marketing-footer">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-5">
            <AranyixLogo className="h-12 w-auto max-w-[260px]" />
            <p className="max-w-sm text-sm leading-relaxed text-emerald-100/75">
              Environmental monitoring, reporting, and verification for plantations, biodiversity,
              and carbon programs — from satellite pixels to audit-ready evidence.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-100/70">
              <Leaf className="h-3.5 w-3.5 text-lime-300" />
              Intelligence for a thriving planet
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-emerald-100/65 transition hover:text-lime-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-emerald-100/55 sm:flex-row">
          <span>© {year} Aranyix. All rights reserved.</span>
          <span className="text-xs uppercase tracking-[0.18em]">Apache-2.0 · Open MRV infrastructure</span>
        </div>
      </div>
    </footer>
  );
}
