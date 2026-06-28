import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-50 to-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-forest-800">
          <span aria-hidden>🌳</span> BYOT
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Bring Your Own Tree.
              <br />
              <span className="text-forest-700">Prove every leaf, every credit.</span>
            </h1>
            <p className="mt-6 text-lg text-stone-700">
              Register trees, monitor health with AI, validate growth via satellite, and
              generate Verra / Gold Standard – ready carbon reports — at planetary scale.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">Register your first tree</Link>
              <Link href="/dashboard" className="btn-secondary">Open the dashboard</Link>
              <a href="/docs" className="btn-ghost">API docs</a>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 text-center">
              {[
                ["10M+", "Trees at scale"],
                ["100+", "Species"],
                ["IPCC", "AR6 + VCS + GS"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-2xl font-bold text-forest-700">{k}</dt>
                  <dd className="text-xs uppercase tracking-wide text-stone-500">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.15),transparent_60%)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-700">
              What you get
            </h2>
            <ul className="relative mt-4 space-y-3 text-sm text-stone-700">
              {[
                "Tree registration with GPS, photos, and unique passport (QR + PDF)",
                "AI species detection across 100+ trees (Neem, Mango, Banyan, Amla, …)",
                "Health classification + disease detection + recommendations",
                "Sentinel-2 / Landsat NDVI monitoring with change detection",
                "Carbon engine: IPCC AR6, Verra VM0047, Gold Standard, revenue projection",
                "Interactive Mapbox map, dashboards, alerts, PDF/Excel reports",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1 text-forest-600">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-stone-500 sm:flex-row">
          <span>© {new Date().getFullYear()} BYOT — Bring Your Own Tree</span>
          <span>Apache-2.0</span>
        </div>
      </footer>
    </div>
  );
}
