#!/usr/bin/env node
/**
 * Capture real Aranyix portal screenshots for the presentation deck.
 * Usage: node scripts/capture-deck-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.DECK_BASE_URL || "http://localhost:3000";
const API = process.env.DECK_API_URL || "http://localhost:8000/api";
const OUT = path.resolve("public/presentation/screenshots");
const VIEWPORT = { width: 1280, height: 720 };

const PAGES = [
  { file: "dashboard.png", path: "/dashboard", wait: 4000 },
  { file: "satellite.png", path: "/satellite", wait: 3500 },
  { file: "monitoring.png", path: "/monitoring", wait: 3500 },
  { file: "map.png", path: "/map", wait: 4000 },
  { file: "intelligence.png", path: "/intelligence", wait: 3500 },
  { file: "bioacoustic.png", path: "/bioacoustic", wait: 3500 },
  { file: "portfolio-health.png", path: "/portfolio-health", wait: 3500 },
  { file: "field-ops.png", path: "/field-ops", wait: 3500 },
  { file: "projects.png", path: "/projects", wait: 3000 },
  { file: "reports.png", path: "/reports", wait: 3500 },
  { file: "alerts.png", path: "/alerts", wait: 3000 },
  { file: "assistant.png", path: "/assistant", wait: 3000 },
  { file: "trees.png", path: "/trees", wait: 3000 },
  { file: "carbon-tools.png", path: "/tools/carbon", wait: 3000 },
  { file: "settings-team.png", path: "/settings/team", wait: 2500 },
  { file: "login-page.png", path: "/login", wait: 2000, noAuth: true },
];

async function getToken() {
  const res = await fetch(`${API}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "manager@byot.earth", password: "byotdemo1234!" }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const token = await getToken();
  console.log("Logged in as manager@byot.earth");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  // Seed auth before any page load
  await context.addInitScript((accessToken) => {
    localStorage.setItem("byot_access_token", accessToken);
    localStorage.setItem(
      "byot-auth",
      JSON.stringify({
        state: { access: accessToken, refresh: "" },
        version: 0,
      }),
    );
  }, token);

  const page = await context.newPage();

  for (const { file, path: route, wait, noAuth } of PAGES) {
    try {
      if (noAuth) {
        await context.clearCookies();
        await page.evaluate(() => {
          localStorage.clear();
        });
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
      } else {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
      }
      await page.waitForTimeout(wait);
      // Hide dev overlay if present
      await page.addStyleTag({
        content: "#deck-no-print, nextjs-portal { display: none !important; }",
      }).catch(() => {});
      const outPath = path.join(OUT, file);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ ${file} (${route})`);
    } catch (err) {
      console.error(`✗ ${file}:`, err.message);
    }
  }

  await browser.close();
  console.log(`Done — screenshots in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
