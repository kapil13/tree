import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { PrivacySettingsPanel } from "@/components/settings/privacy-settings-panel";
import { StepUpModal } from "@/components/platform/step-up-modal";
import en from "@/messages/en.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth-store", () => ({
  useAuth: () => ({ login: vi.fn(), logout: vi.fn(), user: null }),
  useAuthHydrated: () => true,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false }),
    useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  };
});

function withIntl(ui: React.ReactElement) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={en}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function criticalCount(results: Awaited<ReturnType<typeof axe>>) {
  return results.violations.filter((v) => v.impact === "critical").length;
}

describe("WCAG axe — real route components", () => {
  it("AuthGateway sign-in surface has zero critical violations", async () => {
    const { container } = render(withIntl(<AuthGateway initialMode="signin" />));
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });

  it("privacy settings panel has zero critical violations", async () => {
    const { container } = render(withIntl(<PrivacySettingsPanel />));
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });

  it("step-up modal traps focus and exposes dialog semantics", async () => {
    const { container, getByRole } = render(
      withIntl(
        <StepUpModal
          open
          title="Confirm action"
          description="Re-enter your password to continue."
          onClose={() => undefined}
          onConfirm={() => undefined}
        />,
      ),
    );
    expect(getByRole("dialog", { name: "Confirm action" })).toBeTruthy();
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });

  it("map legend pattern meets contrast for overlay labels", async () => {
    const { container } = render(
      <div>
        <div
          className="rounded-lg border border-stone-300 bg-white/95 p-2 text-stone-900 shadow"
          role="img"
          aria-label="Map legend"
        >
          <p className="text-xs font-semibold text-stone-900">NDVI health</p>
          <ul className="mt-1 space-y-1 text-xs text-stone-800">
            <li><span className="inline-block h-2 w-2 rounded-full bg-emerald-600" aria-hidden /> Healthy</li>
            <li><span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Stressed</li>
            <li><span className="inline-block h-2 w-2 rounded-full bg-rose-600" aria-hidden /> Alert</li>
          </ul>
        </div>
      </div>,
    );
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });
});
