import Link from "next/link";
import { AranyixLogo } from "@/components/brand/aranyix-logo";

const NAV = [
  { href: "#platform", label: "Platform" },
  { href: "#compliance", label: "Compliance" },
  { href: "#programs", label: "Programs" },
  { href: "#how-it-works", label: "How it works" },
];

export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Aranyix home">
          <AranyixLogo className="h-11 w-auto max-w-[220px] sm:h-12 sm:max-w-[260px]" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="marketing-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/auth?mode=signin" className="btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/auth?mode=signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
