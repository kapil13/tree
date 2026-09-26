import { describe, expect, it } from "vitest";

const STORAGE_KEY = "aranyix_active_project_id";

describe("project context storage key", () => {
  it("uses a stable localStorage key", () => {
    expect(STORAGE_KEY).toBe("aranyix_active_project_id");
  });
});
