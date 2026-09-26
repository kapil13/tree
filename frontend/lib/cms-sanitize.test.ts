import { describe, expect, it } from "vitest";
import { sanitizeCmsHref, sanitizeCmsHtml } from "./cms-sanitize";

describe("sanitizeCmsHref", () => {
  it("rejects javascript: URLs", () => {
    expect(sanitizeCmsHref("javascript:alert(1)")).toBe("/");
    expect(sanitizeCmsHref("JavaScript:void(0)")).toBe("/");
  });

  it("rejects data: and vbscript:", () => {
    expect(sanitizeCmsHref("data:text/html,<script>")).toBe("/");
    expect(sanitizeCmsHref("vbscript:msgbox")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeCmsHref("//evil.example/path")).toBe("/");
  });

  it("allows https URLs", () => {
    expect(sanitizeCmsHref("https://aranyix.tech/about")).toBe("https://aranyix.tech/about");
  });

  it("allows relative paths and hashes", () => {
    expect(sanitizeCmsHref("/dashboard")).toBe("/dashboard");
    expect(sanitizeCmsHref("/auth?mode=signin")).toBe("/auth?mode=signin");
    expect(sanitizeCmsHref("#platform")).toBe("#platform");
  });

  it("allows mailto", () => {
    expect(sanitizeCmsHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
  });

  it("rejects http and unknown schemes", () => {
    expect(sanitizeCmsHref("http://insecure.example")).toBe("/");
    expect(sanitizeCmsHref("ftp://files.example")).toBe("/");
  });
});

describe("sanitizeCmsHtml", () => {
  it("strips script tags", () => {
    const out = sanitizeCmsHtml('<p>Hi</p><script>alert(1)</script>');
    expect(out).toContain("<p>Hi</p>");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("strips event handlers", () => {
    const out = sanitizeCmsHtml('<p onclick="alert(1)">Hi</p>');
    expect(out).toContain("Hi");
    expect(out.toLowerCase()).not.toContain("onclick");
  });

  it("keeps allowed formatting and safe links", () => {
    const out = sanitizeCmsHtml(
      '<p>Hello <strong>world</strong></p><a href="https://aranyix.tech">Site</a>',
    );
    expect(out).toContain("<strong>world</strong>");
    expect(out).toContain('href="https://aranyix.tech"');
  });
});
