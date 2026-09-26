import { test, expect } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL || "http://localhost:8000";

test.describe("Platform Foundation E4 — API happy path", () => {
  test("health live returns trace id", async ({ request }) => {
    const res = await request.get(`${apiURL}/health/live`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["x-trace-id"]).toBeTruthy();
  });

  test("unauthenticated tree list is rejected", async ({ request }) => {
    const res = await request.get(`${apiURL}/api/v1/trees?page_size=1`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.trace_id).toBeTruthy();
  });

  test("RBAC denial on protected route without token", async ({ request }) => {
    const res = await request.post(`${apiURL}/api/v1/planting-projects`, {
      data: { name: "E2E", code: "e2e-deny", segment: "general" },
    });
    expect(res.status()).toBe(401);
  });
});
