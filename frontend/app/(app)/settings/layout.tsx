import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 border-b border-stone-200 pb-6 dark:border-stone-800">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Settings</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Account, planting programs, carbon tools, and integrations.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
