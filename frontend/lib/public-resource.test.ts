import { describe, expect, it } from "vitest";

import { classifyPublicStatus } from "@/lib/public-resource";

describe("classifyPublicStatus", () => {
  it("treats only HTTP 404 as an unknown id", () => {
    expect(classifyPublicStatus(404)).toBe("missing");
    expect(classifyPublicStatus(200)).toBe("found");
    expect(classifyPublicStatus(410)).toBe("unknown");
    expect(classifyPublicStatus(500)).toBe("unknown");
  });
});