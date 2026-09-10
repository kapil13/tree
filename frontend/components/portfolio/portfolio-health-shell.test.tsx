import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { TreePine } from "lucide-react";
import en from "@/messages/en.json";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioTabBanner } from "./portfolio-tab-banner";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function withIntl(ui: React.ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("PortfolioKpiCard", () => {
  it("renders a link when href is provided", () => {
    render(
      <PortfolioKpiCard icon={TreePine} label="Trees" value="42" href="/trees" />,
    );
    const link = screen.getByRole("link", { name: "Trees: 42" });
    expect(link.getAttribute("href")).toBe("/trees");
  });

  it("fires onClick when provided", () => {
    const onClick = vi.fn();
    render(
      <PortfolioKpiCard
        icon={TreePine}
        label="Violations"
        value="3"
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Violations: 3" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("PortfolioTabBanner", () => {
  it("shows scoped project copy", () => {
    render(
      withIntl(
        <PortfolioTabBanner
          variant="scope"
          description="Showing data for Demo Plantation"
          action={{ label: "View all projects", href: "/portfolio-health" }}
        />,
      ),
    );
    expect(screen.getByText("Showing data for Demo Plantation")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View all projects" }).getAttribute("href")).toBe(
      "/portfolio-health",
    );
  });
});
