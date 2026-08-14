import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

function criticalCount(results: Awaited<ReturnType<typeof axe>>) {
  return results.violations.filter((v) => v.impact === "critical").length;
}

describe("WCAG axe — core route markup patterns", () => {
  it("auth sign-in form has zero critical violations", async () => {
    const { container } = render(
      <main>
        <h1>Sign in</h1>
        <form aria-label="Sign in">
          <label htmlFor="axe-email">Email</label>
          <input id="axe-email" name="email" type="email" autoComplete="email" />
          <label htmlFor="axe-password">Password</label>
          <input id="axe-password" name="password" type="password" autoComplete="current-password" />
          <button type="submit">Sign in</button>
        </form>
      </main>,
    );
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });

  it("dashboard metric strip has zero critical violations", async () => {
    const { container } = render(
      <section aria-labelledby="dash-title">
        <h2 id="dash-title">Dashboard</h2>
        <ul>
          <li>
            <span>Trees registered</span> <strong>120</strong>
          </li>
          <li>
            <span>Carbon stock</span> <strong>4.2 t</strong>
          </li>
        </ul>
        <table>
          <caption>Carbon trajectory data</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">t CO₂e</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Jan</td>
              <td>1.2</td>
            </tr>
          </tbody>
        </table>
      </section>,
    );
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });

  it("tree registration wizard step nav has zero critical violations", async () => {
    const { container } = render(
      <form aria-label="Register tree">
        <nav aria-label="Registration steps">
          <ol>
            <li aria-current="step">Program</li>
            <li>Location</li>
            <li>Review</li>
          </ol>
        </nav>
        <label htmlFor="species">Species</label>
        <input id="species" name="species" />
        <button type="button">Back</button>
        <button type="submit">Submit registration</button>
      </form>,
    );
    const results = await axe(container);
    expect(criticalCount(results)).toBe(0);
  });
});
