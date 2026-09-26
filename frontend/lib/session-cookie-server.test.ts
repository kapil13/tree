import { afterEach, describe, expect, it, vi } from "vitest";
import {
  signSessionCookieValue,
  verifySessionCookieValue,
} from "./session-cookie-server";

describe("session-cookie-server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs and verifies a cookie value", async () => {
    vi.stubEnv("SESSION_COOKIE_SECRET", "test-secret-week2");
    vi.stubEnv("NODE_ENV", "test");
    const value = await signSessionCookieValue(3600);
    expect(value).toMatch(/^\d+\.[A-Za-z0-9_-]+$/);
    expect(await verifySessionCookieValue(value)).toBe(true);
  });

  it("rejects tampered mac", async () => {
    vi.stubEnv("SESSION_COOKIE_SECRET", "test-secret-week2");
    vi.stubEnv("NODE_ENV", "test");
    const value = await signSessionCookieValue(3600);
    const [exp, mac] = value.split(".");
    const tampered = `${exp}.${mac!.slice(0, -2)}xx`;
    expect(await verifySessionCookieValue(tampered)).toBe(false);
  });

  it("rejects expired payload", async () => {
    vi.stubEnv("SESSION_COOKIE_SECRET", "test-secret-week2");
    vi.stubEnv("NODE_ENV", "test");
    const past = Math.floor(Date.now() / 1000) - 10;
    // Sign with negative maxAge effectively expired — craft via sign then wait is slow;
    // instead verify a hand-built expired value with correct mac by temporarily mocking Date.
    const value = await signSessionCookieValue(1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000);
    expect(await verifySessionCookieValue(value)).toBe(false);
    vi.useRealTimers();
  });

  it("rejects legacy '1' outside development", async () => {
    vi.stubEnv("SESSION_COOKIE_SECRET", "test-secret-week2");
    vi.stubEnv("NODE_ENV", "production");
    expect(await verifySessionCookieValue("1")).toBe(false);
  });

  it("accepts legacy '1' in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await verifySessionCookieValue("1")).toBe(true);
  });
});
