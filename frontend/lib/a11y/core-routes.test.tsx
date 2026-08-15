import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { NextIntlClientProvider } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import en from "@/messages/en.json";

function criticalCount(results: Awaited<ReturnType<typeof axe>>) {
  return results.violations.filter((v) => v.impact === "critical").length;
}

function withIntl(ui: React.ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("WCAG axe — core route components", () => {
  it("design system sign-in form has zero critical violations", async () => {
    const { container } = render(
      <main>
        <h1>Sign in</h1>
        <form aria-label="Sign in">
          <label htmlFor="axe-email">Email</label>
          <Input id="axe-email" name="email" type="email" autoComplete="email" />
          <label htmlFor="axe-password">Password</label>
          <Input id="axe-password" name="password" type="password" autoComplete="current-password" />
          <Button type="submit">Sign in</Button>
        </form>
      </main>,
    );
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });

  it("citizen dashboard metric pattern with estimate label has zero critical violations", async () => {
    const { container } = render(
      withIntl(
        <section aria-labelledby="citizen-carbon">
          <h2 id="citizen-carbon">Carbon stored</h2>
          <p>
            <span>120 – 180 kg CO₂e</span>
            <span title="Modeled estimate">Estimate</span>
          </p>
        </section>,
      ),
    );
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });
});
