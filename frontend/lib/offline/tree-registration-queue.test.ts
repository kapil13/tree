import { describe, expect, it } from "vitest";
import { dataUrlToFile } from "@/lib/offline/tree-registration-queue";

describe("tree-registration-queue photo helpers", () => {
  it("restores a file from a data URL", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQ";
    const restored = dataUrlToFile(dataUrl, "tree.jpg");

    expect(restored.name).toBe("tree.jpg");
    expect(restored.type).toBe("image/jpeg");
    expect(restored.size).toBeGreaterThan(0);
  });
});
